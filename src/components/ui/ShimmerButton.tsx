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
      className={`${className} relative overflow-hidden`}
    >
      <span className="relative z-10">{children}</span>
      <span
        className="absolute inset-0 opacity-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(212, 175, 55, 0.4) 0%, rgba(139, 111, 71, 0.2) 30%, transparent 70%)',
          animation: 'gold-pulse 3s ease-in-out infinite',
        }}
      />
    </button>
  );
}
