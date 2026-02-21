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
      <div className="absolute inset-0 -translate-x-full animate-shimmer">
        <div
          className="h-full w-8 rotate-12 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent opacity-70"
          style={{
            boxShadow: '0 0 20px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.4)'
          }}
        />
      </div>
      {children}
    </button>
  );
}
