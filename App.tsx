import React, { useState } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import ChatInterface from './components/ChatInterface';
import Visualizer from './components/Visualizer';
import { ConnectionState } from './types';

const App: React.FC = () => {
  const { 
    connectionState, 
    connect, 
    disconnect, 
    volume, 
    messages, 
    isModelSpeaking 
  } = useLiveSession();

  const handleToggle = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      disconnect();
    } else {
      connect();
    }
  };

  const isConnected = connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING;

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-50 font-sans overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-3">
          {/* Star Logo with Green Live Indicator */}
          <div className="relative">
             <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                   <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" fill="white" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </div>
             {/* Green Online Indicator (Dot) */}
             <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
          </div>
          <div>
            <h1 className="font-semibold text-lg leading-tight tracking-wide text-white">Dhruva</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Oolka Credit Expert</p>
          </div>
        </div>
        
        <a 
          href="https://oolka.page.link/SubscriptionPayWall"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold px-4 py-2 rounded-full bg-gradient-to-r from-amber-200 to-amber-400 text-slate-900 hover:from-amber-300 hover:to-amber-500 transition-all shadow-md shadow-amber-400/10 no-underline"
        >
          Unlock Dhruva
        </a>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        {/* Chat Layer */}
        <div className="flex-1 overflow-y-auto relative z-0 pb-32">
             <ChatInterface messages={messages} />
        </div>
        
        {/* Visualizer & Controls Layer - Fixed at bottom */}
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-24 pb-10 px-6 flex flex-col items-center justify-end z-10 pointer-events-none">
           
           {/* Visualizer Container - Always Visible now */}
           <div className="mb-8 w-full h-32 flex items-center justify-center pointer-events-auto">
                <Visualizer 
                    volume={volume} 
                    isActive={isConnected} 
                    isSpeaking={isModelSpeaking} 
                />
           </div>

           {/* User Hint Text - Only when disconnected */}
           {!isConnected && (
             <div className="mb-6 text-slate-400 text-sm font-medium animate-pulse">
               Tap microphone to start conversation
             </div>
           )}

           {/* Mic Button */}
           <button 
             onClick={handleToggle}
             className={`
               pointer-events-auto
               relative group flex items-center justify-center w-16 h-16 rounded-full transition-all duration-300 shadow-2xl shadow-indigo-500/20
               ${connectionState === ConnectionState.CONNECTED 
                 ? 'bg-red-500 hover:bg-red-600 ring-4 ring-red-500/20 scale-100' 
                 : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 ring-4 ring-indigo-500/20 hover:scale-105 hover:shadow-indigo-500/40'
               }
             `}
           >
              {connectionState === ConnectionState.CONNECTING ? (
                 <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                 // SVG Icons
                 connectionState === ConnectionState.CONNECTED ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                 ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
                 )
              )}
           </button>
           
           <div className="h-6 mt-4 text-xs font-medium text-slate-500">
             {connectionState === ConnectionState.ERROR && <span className="text-red-400 flex items-center gap-1">⚠ Connection Failed</span>}
           </div>

        </div>
      </main>
    </div>
  );
};

export default App;