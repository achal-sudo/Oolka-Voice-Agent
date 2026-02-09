import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean; // True if connected
  isSpeaking: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, isSpeaking }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Colors: Blue-Purple Gradient Theme
      // Idle/Listening: Indigo-Purple
      // Speaking: Cyan-Blue Bright
      
      let mainColor = '#6366f1'; // Indigo 500
      let glowColor = 'rgba(99, 102, 241, 0.5)'; // Indigo Glow
      
      if (isSpeaking) {
        mainColor = '#22d3ee'; // Cyan 400
        glowColor = 'rgba(34, 211, 238, 0.6)';
      } else if (isActive) {
         mainColor = '#8b5cf6'; // Violet 500
         glowColor = 'rgba(139, 92, 246, 0.5)';
      }

      // Calculate Pulse
      // If not active (idle), use sine wave for breathing.
      // If active, use volume.
      let pulseSize = 0;
      let baseRadius = 55;

      if (isActive) {
          const smoothVol = Math.max(0.05, volume * 1.8); 
          pulseSize = smoothVol * 90;
      } else {
          // Idle Breathing Effect
          const breathing = (Math.sin(time * 2) + 1) / 2; // 0 to 1
          pulseSize = breathing * 15; // Gentle pulse
      }

      const totalRadius = baseRadius + pulseSize;

      // 1. Outer Glow (Large, Soft)
      const gradient = ctx.createRadialGradient(centerX, centerY, baseRadius * 0.2, centerX, centerY, totalRadius + 20);
      gradient.addColorStop(0, mainColor);
      gradient.addColorStop(0.4, glowColor);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, totalRadius + 20, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // 2. Core Orb (Sharper)
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius + (pulseSize * 0.4), 0, Math.PI * 2);
      const coreGradient = ctx.createLinearGradient(centerX - 20, centerY - 20, centerX + 20, centerY + 20);
      coreGradient.addColorStop(0, isSpeaking ? '#a5f3fc' : '#c4b5fd'); // Light top
      coreGradient.addColorStop(1, mainColor); // Dark bottom
      ctx.fillStyle = coreGradient;
      ctx.fill();
      
      // 3. Ripples (Only when active and loud enough OR just subtle rings when speaking)
      if (isActive && (volume > 0.02 || isSpeaking)) {
        ctx.strokeStyle = isSpeaking ? 'rgba(165, 243, 252, 0.4)' : 'rgba(167, 139, 250, 0.4)';
        ctx.lineWidth = 1.5;
        
        // Ripple 1
        const r1 = totalRadius + 10 + (Math.sin(time * 5) * 2);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r1, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Ripple 2
        if (volume > 0.1 || isSpeaking) {
          const r2 = totalRadius + 25 + (Math.cos(time * 5) * 2);
          ctx.beginPath();
          ctx.arc(centerX, centerY, r2, 0, 2 * Math.PI);
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [volume, isActive, isSpeaking]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <canvas 
        ref={canvasRef} 
        width={400} 
        height={300}
        className="max-w-full h-auto"
      />
    </div>
  );
};

export default Visualizer;