import React, { useRef, useEffect } from 'react';

interface VisualizerProps {
  volume: number;
  isActive: boolean;
  isSpeaking: boolean;
}

const NUM_BARS = 32;

const Visualizer: React.FC<VisualizerProps> = ({ volume, isActive, isSpeaking }) => {
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!isActive) {
      barsRef.current.forEach((bar) => {
        if (bar) {
          bar.style.height = '4px';
          bar.style.opacity = '0.3';
        }
      });
      return;
    }

    let animationId: number;

    const animate = () => {
      const amplification = isSpeaking ? 280 : 180;
      const baseHeight = isSpeaking ? 8 : 4;
      const normalizedVolume = Math.min(volume * amplification, 1);

      barsRef.current.forEach((bar, i) => {
        if (!bar) return;

        const center = NUM_BARS / 2;
        const distFromCenter = Math.abs(i - center) / center;
        const envelope = 1 - distFromCenter * distFromCenter;

        const randomFactor = 0.5 + Math.random() * 0.5;
        const height = baseHeight + normalizedVolume * 100 * envelope * randomFactor;

        bar.style.height = `${Math.max(baseHeight, height)}px`;
        bar.style.opacity = `${0.3 + normalizedVolume * 0.7 * envelope}`;
      });

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [volume, isActive, isSpeaking]);

  return (
    <div className="flex items-center justify-center gap-[3px] h-full w-full max-w-md mx-auto">
      {Array.from({ length: NUM_BARS }).map((_, i) => (
        <div
          key={i}
          ref={(el) => { barsRef.current[i] = el; }}
          className={`w-[3px] rounded-full transition-colors duration-300 ${
            isSpeaking
              ? 'bg-indigo-400'
              : isActive
              ? 'bg-slate-400'
              : 'bg-slate-600'
          }`}
          style={{
            height: '4px',
            opacity: 0.3,
            transition: 'height 0.08s ease-out, opacity 0.08s ease-out',
          }}
        />
      ))}
    </div>
  );
};

export default Visualizer;
