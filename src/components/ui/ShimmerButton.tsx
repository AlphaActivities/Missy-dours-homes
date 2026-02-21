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
      <span className="absolute inset-0 pointer-events-none">
        <span
          className="absolute top-[-50%] left-[-100%] w-[50px] h-[200%] bg-gradient-to-r from-transparent via-[#FFD700] to-transparent transform -skew-x-12 opacity-0"
          style={{
            animation: 'diagonal-gold-sweep 4s ease-in-out infinite',
            boxShadow: '0 0 40px 10px rgba(255, 215, 0, 0.6)',
            background: 'linear-gradient(90deg, transparent 0%, #FFD700 20%, #FFC700 40%, #FFE55C 50%, #FFC700 60%, #FFD700 80%, transparent 100%)'
          }}
        />
      </span>
      <span className="relative z-10">{children}</span>
    </button>
  );
}
