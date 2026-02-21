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
    >
      {children}
      <span
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(218, 165, 32, 0.6) 50%, transparent 100%)',
          width: '30%',
          animation: 'shimmer 4s linear infinite',
        }}
      />
      <style>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          25% {
            transform: translateX(400%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </button>
  );
}
