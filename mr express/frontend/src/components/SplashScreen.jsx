import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase('out'), 2500);
    const doneTimer = setTimeout(() => onDone(), 3100);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        zIndex: 99999,
        overflow: 'hidden',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      <img
        src="/shop/logo.png"
        alt="MR Market"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          animation: 'splashZoom 3s ease forwards',
        }}
      />
      <style>{`
        @keyframes splashZoom {
          0%   { transform: scale(1.0); }
          100% { transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
