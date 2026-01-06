import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from './Input';
import { Button } from './Button';

interface PasswordModalProps {
  isOpen: boolean;
  title: string;
  description?: string;
  requireLongPress?: boolean;
  longPressSeconds?: number;
  onSubmit: (password: string) => Promise<boolean>;
  onCancel: () => void;
}

export function PasswordModal({
  isOpen,
  title,
  description,
  requireLongPress = false,
  longPressSeconds = 5,
  onSubmit,
  onCancel
}: PasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pressProgress, setPressProgress] = useState(0);
  const pressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pressStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError('');
      setPressProgress(0);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setError('');
    
    const success = await onSubmit(password);
    
    if (!success) {
      setError('Incorrect password');
      setPassword('');
    }
    
    setIsSubmitting(false);
  }, [password, onSubmit, isSubmitting]);

  const handlePressStart = () => {
    if (!requireLongPress || !password) return;
    
    pressStartRef.current = Date.now();
    pressIntervalRef.current = setInterval(() => {
      if (!pressStartRef.current) return;
      
      const elapsed = Date.now() - pressStartRef.current;
      const progress = Math.min(100, (elapsed / (longPressSeconds * 1000)) * 100);
      setPressProgress(progress);
      
      if (progress >= 100) {
        handlePressEnd(true);
      }
    }, 50);
  };

  const handlePressEnd = (completed = false) => {
    if (pressIntervalRef.current) {
      clearInterval(pressIntervalRef.current);
      pressIntervalRef.current = null;
    }
    pressStartRef.current = null;
    setPressProgress(0);
    
    if (completed) {
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md glass rounded-2xl p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description && (
            <p className="text-white/60 mt-2">{description}</p>
          )}
        </div>

        <div>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            error={error}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !requireLongPress && password) {
                handleSubmit();
              }
            }}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          
          {requireLongPress ? (
            <div className="flex-1 relative">
              <button
                className="w-full px-4 py-2 rounded-xl bg-white/10 text-white border border-white/20
                  hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed
                  relative overflow-hidden"
                disabled={!password || isSubmitting}
                onMouseDown={handlePressStart}
                onMouseUp={() => handlePressEnd()}
                onMouseLeave={() => handlePressEnd()}
                onTouchStart={handlePressStart}
                onTouchEnd={() => handlePressEnd()}
              >
                {/* Progress fill */}
                <div 
                  className="absolute inset-0 bg-white/20 transition-all"
                  style={{ width: `${pressProgress}%` }}
                />
                <span className="relative">
                  Hold for {longPressSeconds}s
                </span>
              </button>
            </div>
          ) : (
            <Button 
              onClick={handleSubmit} 
              disabled={!password || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? 'Verifying...' : 'Confirm'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
