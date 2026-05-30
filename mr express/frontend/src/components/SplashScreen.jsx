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
        backgroundColor: '#ffffff',
        transition: 'opacity 0.6s ease',
        opacity: phase === 'out' ? 0 : 1,
        pointerEvents: phase === 'out' ? 'none' : 'all',
        width: '100vw',
        height: '100vh',
      }}
    >
      <img
        src="/shop/logo.png"
        alt="MR Market"
        style={{
          width: '80vw',
          maxWidth: 360,
          height: 'auto',
          objectFit: 'contain',
          animation: 'splashPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      />
      <style>{`
        @keyframes splashPop {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
