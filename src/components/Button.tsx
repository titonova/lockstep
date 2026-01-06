import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({ 
  children, 
  variant = 'primary',
  size = 'md',
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2';
  
  const variantClasses = {
    primary: 'bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/30',
    secondary: 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10',
    danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30',
    ghost: 'bg-transparent hover:bg-white/5 text-white/60 hover:text-white'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
