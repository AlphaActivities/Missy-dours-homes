import { ReactNode } from 'react';

interface ShimmerButtonProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function ShimmerButton({ children, className = '', onClick }: ShimmerButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative overflow-hidden ${className}`}
      style={{
        isolation: 'isolate',
      }}
    >
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(246,230,191,0.35) 0%, rgba(226,200,141,0.2) 40%, rgba(196,164,106,0.08) 70%, rgba(196,164,106,0) 100%)',
          animation: 'luxGoldPulse 4s ease-in-out infinite',
          boxShadow: `
            inset 0 0 30px rgba(246,230,191,0.25),
            inset 0 0 50px rgba(226,200,141,0.15)
          `,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(246,230,191,0.5) 50%, transparent 100%)',
          width: '35%',
          height: '100%',
          animation: 'luxGoldShimmer 4s ease-in-out infinite',
          filter: 'blur(10px)',
          opacity: 0.4,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(196,164,106,0) 0%, rgba(196,164,106,0.25) 15%, rgba(226,200,141,0.5) 35%, rgba(246,230,191,0.85) 45%, rgba(231,212,168,0.85) 50%, rgba(246,230,191,0.85) 55%, rgba(226,200,141,0.5) 65%, rgba(196,164,106,0.25) 85%, rgba(196,164,106,0) 100%)',
          width: '100px',
          height: '200%',
          top: '-50%',
          left: '-150px',
          transform: 'rotate(20deg)',
          animation: 'luxGoldSweep 5s ease-in-out infinite',
          filter: 'blur(3px)',
          boxShadow: `
            0 0 25px rgba(246,230,191,0.6),
            0 0 45px rgba(226,200,141,0.4),
            0 0 65px rgba(196,164,106,0.2)
          `,
        }}
      />
      {children}
    </button>
  );
}
