import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="space-y-1">
        {label && (
          <label className="block text-sm text-white/60">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
            text-white placeholder-white/40 focus:outline-none focus:border-white/30 
            focus:bg-white/8 transition-all ${error ? 'border-red-500/50' : ''} ${className}`}
          {...props}
        />
        {error && (
          <p className="text-sm text-red-400">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
