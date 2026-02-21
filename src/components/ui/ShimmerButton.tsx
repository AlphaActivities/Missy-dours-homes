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
          background: 'radial-gradient(ellipse at center, rgba(246,230,191,0.4) 0%, rgba(226,200,141,0.25) 40%, rgba(196,164,106,0.1) 70%, rgba(196,164,106,0) 100%)',
          animation: 'luxGoldPulse 3s ease-in-out infinite',
          boxShadow: `
            inset 0 0 30px rgba(246,230,191,0.3),
            inset 0 0 50px rgba(226,200,141,0.2)
          `,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(246,230,191,0.6) 50%, transparent 100%)',
          width: '30%',
          height: '100%',
          animation: 'luxGoldShimmer 3s ease-in-out infinite',
          filter: 'blur(8px)',
          opacity: 0.5,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(196,164,106,0) 0%, rgba(196,164,106,0.3) 15%, rgba(226,200,141,0.6) 35%, rgba(246,230,191,1) 45%, rgba(231,212,168,1) 50%, rgba(246,230,191,1) 55%, rgba(226,200,141,0.6) 65%, rgba(196,164,106,0.3) 85%, rgba(196,164,106,0) 100%)',
          width: '80px',
          height: '200%',
          top: '-50%',
          left: '-150px',
          transform: 'rotate(20deg)',
          animation: 'luxGoldSweep 4s linear infinite',
          filter: 'blur(2px)',
          boxShadow: `
            0 0 20px rgba(246,230,191,0.8),
            0 0 40px rgba(226,200,141,0.5),
            0 0 60px rgba(196,164,106,0.3)
          `,
        }}
      />
      {children}
    </button>
  );
}
