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
          background: 'linear-gradient(90deg, rgba(196,164,106,0) 0%, rgba(196,164,106,0.3) 15%, rgba(226,200,141,0.6) 35%, rgba(246,230,191,1) 45%, rgba(231,212,168,1) 50%, rgba(246,230,191,1) 55%, rgba(226,200,141,0.6) 65%, rgba(196,164,106,0.3) 85%, rgba(196,164,106,0) 100%)',
          width: '90px',
          height: '200%',
          top: '-50%',
          left: '-150px',
          transform: 'rotate(20deg)',
          animation: 'luxGoldSweep 4s linear infinite',
          filter: 'blur(2px)',
          boxShadow: `
            0 0 25px rgba(246,230,191,0.9),
            0 0 50px rgba(226,200,141,0.6),
            0 0 70px rgba(196,164,106,0.4)
          `,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(245,230,200,0) 0%, rgba(245,230,200,0.4) 20%, rgba(226,200,141,0.7) 40%, rgba(245,230,200,0.8) 50%, rgba(226,200,141,0.7) 60%, rgba(245,230,200,0.4) 80%, rgba(245,230,200,0) 100%)',
          width: '70px',
          height: '200%',
          top: '-50%',
          left: '-180px',
          transform: 'rotate(20deg)',
          animation: 'luxGoldSweepSecondary 4s linear infinite 0.15s',
          filter: 'blur(3px)',
          boxShadow: `
            0 0 20px rgba(245,230,200,0.7),
            0 0 40px rgba(226,200,141,0.5)
          `,
        }}
      />
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, rgba(245,230,200,0) 0%, rgba(226,200,141,0.3) 25%, rgba(245,230,200,0.5) 50%, rgba(226,200,141,0.3) 75%, rgba(245,230,200,0) 100%)',
          width: '60px',
          height: '200%',
          top: '-50%',
          left: '-210px',
          transform: 'rotate(20deg)',
          animation: 'luxGoldSweepTertiary 4s linear infinite 0.3s',
          filter: 'blur(4px)',
          boxShadow: `
            0 0 15px rgba(245,230,200,0.5),
            0 0 30px rgba(226,200,141,0.3)
          `,
        }}
      />
      {children}
    </button>
  );
}
