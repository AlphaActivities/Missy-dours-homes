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
          className="absolute inset-0 w-[55px] h-full bg-gradient-to-r from-transparent via-[#FFE5B4]/40 to-transparent opacity-0 blur-[8px]"
          style={{
            animation: 'liquidGoldPour 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
            boxShadow: '0 0 25px rgba(255, 229, 180, 0.7), 0 0 45px rgba(244, 196, 48, 0.5), 0 0 60px rgba(184, 134, 11, 0.3)',
          }}
        />
        <span
          className="absolute inset-0 w-[50px] h-full bg-gradient-to-r from-transparent via-[#F4C430]/60 to-transparent opacity-0 blur-[4px]"
          style={{
            animation: 'liquidGoldPour 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
            animationDelay: '0.08s',
          }}
        />
        <span
          className="absolute inset-0 w-[45px] h-full bg-gradient-to-r from-transparent via-[#B8860B] to-transparent opacity-0 blur-[2px]"
          style={{
            animation: 'liquidGoldPour 4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite',
            animationDelay: '0.15s',
          }}
        />
      </span>
      {children}
    </button>
  );
}
