import { useEffect, useState } from 'react';

export default function SplashScreen({ onDone }) {
  const [phase, setPhase] = useState('in');

  useEffect(() => {
    const showTimer = setTimeout(() => setPhase('out'), 2400);
    const doneTimer = setTimeout(() => onDone(), 3000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(doneTimer);
    };
  }, [onDone]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #e8f0fe 0%, #dce8ff 50%, #eef2ff 100%)',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'all',
      }}
    >
      <img
        src="/shop/logo.png"
        alt="MR Market"
        style={{
          width: 220,
          height: 220,
          objectFit: 'contain',
          filter: 'drop-shadow(0 8px 32px rgba(30,64,175,0.18))',
          animation: 'splashPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      />
      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.75); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
