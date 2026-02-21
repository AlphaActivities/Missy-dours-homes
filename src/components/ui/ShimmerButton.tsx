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
        className="absolute inset-0 -translate-x-full animate-metallic-sweep opacity-0"
        style={{
          background: 'linear-gradient(135deg, transparent 0%, transparent 35%, #8B6F47 45%, #D4AF37 50%, #F5E6C8 55%, #D4AF37 60%, #8B6F47 65%, transparent 75%, transparent 100%)',
          animation: 'metallic-sweep 4s ease-in-out infinite',
        }}
      />
    </button>
  );
}
