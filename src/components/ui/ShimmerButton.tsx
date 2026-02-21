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
          className="absolute inset-0 w-[20px] h-full bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-0 blur-[1px]"
          style={{
            animation: 'champagneSparkle 2.5s ease-out infinite',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.9), 0 0 25px rgba(255, 250, 205, 0.6), 0 0 35px rgba(255, 215, 0, 0.3)',
          }}
        />
        <span
          className="absolute inset-0 w-[15px] h-full bg-gradient-to-r from-transparent via-[#FFFACD]/70 to-transparent opacity-0 blur-[3px]"
          style={{
            animation: 'champagneSparkle 2.5s ease-out infinite',
            animationDelay: '0.6s',
          }}
        />
        <span
          className="absolute inset-0 w-[12px] h-full bg-gradient-to-r from-transparent via-[#FFD700]/60 to-transparent opacity-0 blur-[2px]"
          style={{
            animation: 'champagneSparkle 2.5s ease-out infinite',
            animationDelay: '1.2s',
          }}
        />
        <span
          className="absolute inset-0 w-[18px] h-full bg-gradient-to-r from-transparent via-white/70 to-transparent opacity-0 blur-[1px]"
          style={{
            animation: 'champagneSparkle 2.5s ease-out infinite',
            animationDelay: '1.8s',
          }}
        />
      </span>
      {children}
    </button>
  );
}
