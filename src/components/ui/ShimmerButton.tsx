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
          className="absolute inset-0 w-[25px] h-full bg-gradient-to-r from-transparent via-[#F5E6C8] to-transparent opacity-0 blur-[2px]"
          style={{
            animation: 'crystalSweep 4s ease-in-out infinite',
            boxShadow: '0 0 15px rgba(245, 230, 200, 0.8), 0 0 30px rgba(212, 175, 55, 0.6)',
          }}
        />
        <span
          className="absolute inset-0 w-[25px] h-full bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-0"
          style={{
            animation: 'crystalSweep 4s ease-in-out infinite',
            animationDelay: '0.05s',
          }}
        />
      </span>
      {children}
    </button>
  );
}
