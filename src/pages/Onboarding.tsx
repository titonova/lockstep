import { useState } from 'react';
import { useStore } from '../store';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VisualMode } from '../types';

interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [visualMode, setVisualMode] = useState<VisualMode>('standard');
  const [quotesEnabled, setQuotesEnabled] = useState(true);

  const { setPassword: savePassword, updateSettings, completeOnboarding } = useStore();

  const handlePasswordNext = async () => {
    if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters');
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    await savePassword(password);
    setStep(1);
  };

  const handleFinish = () => {
    updateSettings({ visualMode, quotesEnabled });
    completeOnboarding();
    onComplete();
  };

  const steps = [
    // Step 0: Set Password
    <div key="password" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Set Your Password</h2>
        <p className="text-white/60 mt-2">
          This password protects you from yourself. You'll need it to add extra time or pause a session.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
          placeholder="Enter password"
        />
        <Input
          type="password"
          label="Confirm Password"
          value={confirmPassword}
          onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
          placeholder="Confirm password"
          error={passwordError}
        />
      </div>

      <Button onClick={handlePasswordNext} className="w-full" size="lg">
        Continue
      </Button>
    </div>,

    // Step 1: Visual Mode
    <div key="visual" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Choose Visual Intensity</h2>
        <p className="text-white/60 mt-2">
          How aggressive should the visual warnings be when time is running out?
        </p>
      </div>

      <div className="space-y-3">
        {([
          { mode: 'calm' as VisualMode, label: 'Calm', desc: 'Subtle visual cues, no sounds' },
          { mode: 'standard' as VisualMode, label: 'Standard', desc: 'Balanced urgency indicators' },
          { mode: 'aggressive' as VisualMode, label: 'Aggressive', desc: 'Maximum pressure when low on time' }
        ]).map(({ mode, label, desc }) => (
          <button
            key={mode}
            onClick={() => setVisualMode(mode)}
            className={`w-full p-4 rounded-xl border transition-all text-left
              ${visualMode === mode 
                ? 'border-white/30 bg-white/10' 
                : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
          >
            <div className="font-medium text-white">{label}</div>
            <div className="text-sm text-white/50">{desc}</div>
          </button>
        ))}
      </div>

      <Button onClick={() => setStep(2)} className="w-full" size="lg">
        Continue
      </Button>
    </div>,

    // Step 2: Quotes
    <div key="quotes" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Motivational Quotes</h2>
        <p className="text-white/60 mt-2">
          Would you like to see occasional motivational quotes?
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setQuotesEnabled(true)}
          className={`w-full p-4 rounded-xl border transition-all text-left
            ${quotesEnabled 
              ? 'border-white/30 bg-white/10' 
              : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
        >
          <div className="font-medium text-white">Yes, show quotes</div>
          <div className="text-sm text-white/50">Subtle, non-intrusive reminders</div>
        </button>
        <button
          onClick={() => setQuotesEnabled(false)}
          className={`w-full p-4 rounded-xl border transition-all text-left
            ${!quotesEnabled 
              ? 'border-white/30 bg-white/10' 
              : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
        >
          <div className="font-medium text-white">No, keep it minimal</div>
          <div className="text-sm text-white/50">Just the timer and tasks</div>
        </button>
      </div>

      <Button onClick={() => setStep(3)} className="w-full" size="lg">
        Continue
      </Button>
    </div>,

    // Step 3: Rules
    <div key="rules" className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">How It Works</h2>
        <p className="text-white/60 mt-2">
          A few important rules to understand
        </p>
      </div>

      <div className="space-y-4 text-white/80">
        <div className="flex gap-3">
          <span className="text-green-400">✓</span>
          <span>Add tasks with time estimates before starting</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-400">✓</span>
          <span>Once started, tasks run sequentially with no going back</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-400">✓</span>
          <span>Time extensions require your password</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-400">✓</span>
          <span>Emergency pause requires password + long press</span>
        </div>
        <div className="flex gap-3">
          <span className="text-green-400">✓</span>
          <span>Complete tasks early for a sense of achievement</span>
        </div>
      </div>

      <Button onClick={handleFinish} className="w-full" size="lg">
        Start Using Lockstep
      </Button>
    </div>
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-md">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2, 3].map(i => (
            <div 
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'bg-white w-6' : i < step ? 'bg-white/50' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {steps[step]}
      </GlassCard>
    </div>
  );
}
