import { useState } from 'react';
import { useStore } from '../store';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { VisualMode } from '../types';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const settings = useStore(state => state.settings);
  const updateSettings = useStore(state => state.updateSettings);
  const setPassword = useStore(state => state.setPassword);
  const verifyPassword = useStore(state => state.verifyPassword);
  const addQuote = useStore(state => state.addQuote);
  const removeQuote = useStore(state => state.removeQuote);
  const resetApp = useStore(state => state.resetApp);

  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [addingQuote, setAddingQuote] = useState(false);
  const [newQuoteText, setNewQuoteText] = useState('');
  const [newQuoteAuthor, setNewQuoteAuthor] = useState('');

  const handlePasswordChange = async () => {
    setPasswordError('');
    setPasswordSuccess(false);

    const isValid = await verifyPassword(currentPassword);
    if (!isValid) {
      setPasswordError('Current password is incorrect');
      return;
    }

    if (newPassword.length < 4) {
      setPasswordError('New password must be at least 4 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    await setPassword(newPassword);
    setPasswordSuccess(true);
    setChangingPassword(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  const handleAddQuote = () => {
    if (newQuoteText.trim()) {
      addQuote({
        text: newQuoteText.trim(),
        author: newQuoteAuthor.trim() || undefined
      });
      setNewQuoteText('');
      setNewQuoteAuthor('');
      setAddingQuote(false);
    }
  };

  const handleResetApp = () => {
    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
      resetApp();
      window.location.reload();
    }
  };

  const customQuotes = settings.quotes.filter(q => !q.isDefault);

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        {/* Visual Mode */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold text-white">Visual Intensity</h3>
          <div className="grid grid-cols-3 gap-2">
            {(['calm', 'standard', 'aggressive'] as VisualMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => updateSettings({ visualMode: mode })}
                className={`p-3 rounded-xl border transition-all capitalize
                  ${settings.visualMode === mode 
                    ? 'border-white/30 bg-white/10' 
                    : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Sound */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Sound Effects</h3>
            <button
              onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.soundEnabled ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          {settings.soundEnabled && (
            <div className="space-y-2">
              <label className="text-sm text-white/60">Volume</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.soundVolume}
                onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
          )}
        </GlassCard>

        {/* Quotes */}
        <GlassCard className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Motivational Quotes</h3>
            <button
              onClick={() => updateSettings({ quotesEnabled: !settings.quotesEnabled })}
              className={`w-12 h-6 rounded-full transition-all ${
                settings.quotesEnabled ? 'bg-green-500' : 'bg-white/20'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                settings.quotesEnabled ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {settings.quotesEnabled && (
            <>
              {customQuotes.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-white/60">Your quotes:</p>
                  {customQuotes.map(quote => (
                    <div key={quote.id} className="flex items-center gap-2 p-2 bg-white/5 rounded-lg">
                      <p className="flex-1 text-sm text-white/80 truncate">"{quote.text}"</p>
                      <button
                        onClick={() => removeQuote(quote.id)}
                        className="p-1 hover:bg-red-500/20 rounded text-white/40 hover:text-red-400"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {addingQuote ? (
                <div className="space-y-3 p-3 bg-white/5 rounded-xl">
                  <Input
                    value={newQuoteText}
                    onChange={(e) => setNewQuoteText(e.target.value)}
                    placeholder="Quote text"
                    autoFocus
                  />
                  <Input
                    value={newQuoteAuthor}
                    onChange={(e) => setNewQuoteAuthor(e.target.value)}
                    placeholder="Author (optional)"
                  />
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setAddingQuote(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleAddQuote}>Add</Button>
                  </div>
                </div>
              ) : (
                <Button variant="secondary" onClick={() => setAddingQuote(true)} className="w-full">
                  Add Quote
                </Button>
              )}
            </>
          )}
        </GlassCard>

        {/* Password */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold text-white">Change Password</h3>
          {passwordSuccess && (
            <p className="text-green-400 text-sm">Password updated successfully!</p>
          )}
          {changingPassword ? (
            <div className="space-y-3">
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => { setCurrentPassword(e.target.value); setPasswordError(''); }}
                placeholder="Current password"
              />
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                placeholder="New password"
              />
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                placeholder="Confirm new password"
                error={passwordError}
              />
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setChangingPassword(false)}>Cancel</Button>
                <Button onClick={handlePasswordChange}>Save</Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setChangingPassword(true)}>
              Change Password
            </Button>
          )}
        </GlassCard>

        {/* Advanced */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold text-white">Advanced</h3>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-white/60">Extension threshold (%)</label>
              <Input
                type="number"
                min="1"
                max="50"
                value={settings.extensionThresholdPercent}
                onChange={(e) => updateSettings({ extensionThresholdPercent: parseInt(e.target.value) || 10 })}
              />
              <p className="text-xs text-white/40 mt-1">
                Extensions appear when remaining time drops below this percentage
              </p>
            </div>
            <div>
              <label className="text-sm text-white/60">Long press duration (seconds)</label>
              <Input
                type="number"
                min="3"
                max="15"
                value={settings.longPressSeconds}
                onChange={(e) => updateSettings({ longPressSeconds: parseInt(e.target.value) || 5 })}
              />
              <p className="text-xs text-white/40 mt-1">
                How long to hold for emergency pause
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard className="space-y-4 border-red-500/30">
          <h3 className="font-semibold text-red-400">Danger Zone</h3>
          <Button variant="danger" onClick={handleResetApp}>
            Reset All Data
          </Button>
          <p className="text-xs text-white/40">
            This will delete all tasks, history, and settings. This cannot be undone.
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
