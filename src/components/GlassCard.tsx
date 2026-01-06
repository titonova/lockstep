import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: 'default' | 'dark' | 'light';
  onClick?: () => void;
}

export function GlassCard({ 
  children, 
  className = '', 
  variant = 'default',
  onClick 
}: GlassCardProps) {
  const variantClasses = {
    default: 'glass',
    dark: 'glass-dark',
    light: 'glass-light'
  };

  return (
    <div 
      className={`rounded-2xl p-6 ${variantClasses[variant]} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
