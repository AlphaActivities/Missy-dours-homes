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
      className={`relative ${className}`}
    >
      {children}
    </button>
  );
}
