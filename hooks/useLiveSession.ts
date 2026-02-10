import { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { ConnectionState, Message } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audioUtils';

export const useLiveSession = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [messages, setMessages] = useState<Message[]>([]);
  const [volume, setVolume] = useState<number>(0);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  
  // Transcription Refs
  const inputTranscriptionRef = useRef('');
  const outputTranscriptionRef = useRef('');
  
  // Audio Context and Processing Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Audio Output Refs
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const gainNodeRef = useRef<GainNode | null>(null);

  // Session
  const sessionPromiseRef = useRef<Promise<any> | null>(null);

  const disconnect = useCallback(async () => {
    console.log("Disconnecting session...");
    
    // Stop microphone stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    // Disconnect input audio nodes
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current.onaudioprocess = null; // Important: Clear the event handler
      scriptProcessorRef.current = null;
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
      inputSourceRef.current = null;
    }
    
    // Stop all playing audio
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    audioSourcesRef.current.clear();

    // Close Audio Contexts
    if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
      await inputAudioContextRef.current.close();
    }
    if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      await outputAudioContextRef.current.close();
    }
    
    inputAudioContextRef.current = null;
    outputAudioContextRef.current = null;

    // Close session if active (though we mostly rely on dropping the reference)
    // There is no explicit .close() on the session object in the current SDK version exposed synchronously,
    // but the server closes when websocket drops.
    sessionPromiseRef.current = null;

    inputTranscriptionRef.current = '';
    outputTranscriptionRef.current = '';
    
    setIsModelSpeaking(false);
    setVolume(0);
    
    // Only update state if we are not already in ERROR state (to preserve error messages)
    setConnectionState(prev => prev === ConnectionState.ERROR ? prev : ConnectionState.DISCONNECTED);
  }, []);

  const connect = useCallback(async () => {
    try {
      // Clean up any existing session first
      await disconnect();
      
      const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
      console.log("[v0] API Key present:", !!apiKey);
      
      if (!apiKey) {
        const errorMsg = "Gemini API key not found. Please add GEMINI_API_KEY to your environment variables.";
        console.error("[v0]", errorMsg);
        setConnectionState(ConnectionState.ERROR);
        setMessages([{ 
          id: 'error', 
          role: 'system', 
          text: errorMsg, 
          timestamp: new Date() 
        }]);
        return;
      }

      setConnectionState(ConnectionState.CONNECTING);
      setMessages([]); // Clear messages on new connection

      // Initialize Audio Contexts
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });
      outputAudioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
      
      // Output Gain Node
      gainNodeRef.current = outputAudioContextRef.current.createGain();
      gainNodeRef.current.connect(outputAudioContextRef.current.destination);

      // Get Microphone Access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      // Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const config = {
        model: MODEL_NAME,
        responseModalities: [Modality.AUDIO],
        systemInstruction: SYSTEM_INSTRUCTION,
        speechConfig: {
          // Puck is often a good relatable male voice. 
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
        },
        inputAudioTranscription: {}, 
        outputAudioTranscription: {},
      };

      const sessionPromise = ai.live.connect({
        model: MODEL_NAME,
        config,
        callbacks: {
          onopen: () => {
            console.log('Gemini Live Session Opened');
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Audio Processing after connection opens
            if (!inputAudioContextRef.current || !mediaStreamRef.current) return;
            
            const source = inputAudioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
            inputSourceRef.current = source;
            
            // ScriptProcessor (Buffer size 4096, 1 input channel, 1 output channel)
            const processor = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate volume for visualizer
              let sum = 0;
              for (let i = 0; i < inputData.length; i++) {
                sum += inputData[i] * inputData[i];
              }
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(rms); 

              // Send to Gemini
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              }).catch(err => {
                // Suppress errors from sendRealtimeInput when session is closing/closed
                // console.warn("Send input failed:", err);
              });
            };

            source.connect(processor);
            processor.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle Input Transcription
             if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                inputTranscriptionRef.current += text;
             }

             // Handle Output Transcription
             if (message.serverContent?.outputTranscription) {
                const text = message.serverContent.outputTranscription.text;
                outputTranscriptionRef.current += text;
             }

             // Handle Turn Complete
             if (message.serverContent?.turnComplete) {
                const userText = inputTranscriptionRef.current;
                const modelText = outputTranscriptionRef.current;

                if (userText || modelText) {
                    setMessages(prev => {
                        const newMsgs = [...prev];
                        if (userText) {
                            newMsgs.push({
                                id: Date.now().toString() + '_user',
                                role: 'user',
                                text: userText,
                                timestamp: new Date()
                            });
                        }
                        if (modelText) {
                            newMsgs.push({
                                id: Date.now().toString() + '_model',
                                role: 'model',
                                text: modelText,
                                timestamp: new Date()
                            });
                        }
                        return newMsgs;
                    });
                    
                    inputTranscriptionRef.current = '';
                    outputTranscriptionRef.current = '';
                }
             }

            // Handle Audio Output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && outputAudioContextRef.current) {
              const ctx = outputAudioContextRef.current;
              const audioData = base64ToUint8Array(base64Audio);
              const audioBuffer = await decodeAudioData(audioData, ctx);
              
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNodeRef.current!); 

              // Schedule playback
              const currentTime = ctx.currentTime;
              if (nextStartTimeRef.current < currentTime) {
                nextStartTimeRef.current = currentTime;
              }
              
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              
              audioSourcesRef.current.add(source);
              
              setIsModelSpeaking(true);
              source.onended = () => {
                audioSourcesRef.current.delete(source);
                if (audioSourcesRef.current.size === 0) {
                  setIsModelSpeaking(false);
                }
              };
            }
            
            // Handle Interruption
            if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(src => {
                    try { src.stop(); } catch(e) {}
                });
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                setIsModelSpeaking(false);
                // Keep partial transcription for context if needed, or clear.
            }
          },
          onclose: () => {
            console.log('Session Closed');
            disconnect();
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error('[v0] Session Error:', err);
            console.error('[v0] Error details:', {
              message: err?.message,
              code: err?.code,
              status: err?.status,
            });
            disconnect();
            setConnectionState(ConnectionState.ERROR);
          }
        }
      });

      sessionPromiseRef.current = sessionPromise;

      // Catch initial connection errors (e.g., Network Error, Invalid Key)
      sessionPromise.catch(err => {
         console.error("[v0] Connection failed at startup:", err);
         console.error("[v0] Startup error details:", {
           message: err?.message,
           code: err?.code,
           status: err?.status,
           type: err?.constructor?.name,
         });
         disconnect();
         setConnectionState(ConnectionState.ERROR);
      });

    } catch (error) {
      console.error("[v0] Connection initialization failed:", error);
      setConnectionState(ConnectionState.ERROR);
    }
  }, [disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connectionState,
    connect,
    disconnect,
    volume,
    messages,
    isModelSpeaking
  };
};
