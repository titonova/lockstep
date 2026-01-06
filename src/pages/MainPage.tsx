import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { GlassCard } from '../components/GlassCard';
import { TaskList } from '../components/TaskList';
import { TimerDisplay } from '../components/TimerDisplay';
import { PasswordModal } from '../components/PasswordModal';
import { QuoteDisplay } from '../components/QuoteDisplay';
import { Button } from '../components/Button';
import { formatHours } from '../utils/time';
import { playStartSound, playCompletionSound, playExtensionSound, playPauseSound } from '../utils/audio';
import { triggerConfetti, triggerSessionCompleteConfetti } from '../components/Confetti';

interface MainPageProps {
  onNavigate: (page: 'history' | 'settings') => void;
}

export function MainPage({ onNavigate }: MainPageProps) {
  const {
    settings,
    currentSession,
    timerActive,
    elapsedMs,
    createSession,
    addTask,
    updateTask,
    removeTask,
    reorderTasks,
    startSession,
    completeCurrentTask,
    tick,
    addExtension,
    emergencyPause,
    resumeFromPause,
    verifyPassword
  } = useStore();

  const [showPreFlight, setShowPreFlight] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    action: 'extend' | 'pause';
    minutes?: number;
  }>({ open: false, action: 'extend' });
  const [sessionComplete, setSessionComplete] = useState(false);

  // Create session if none exists
  useEffect(() => {
    if (!currentSession) {
      createSession();
    }
  }, [currentSession, createSession]);

  // Timer tick
  useEffect(() => {
    if (!timerActive) return;

    const interval = setInterval(() => {
      tick();
    }, 100);

    return () => clearInterval(interval);
  }, [timerActive, tick]);

  // Check for session completion
  useEffect(() => {
    if (currentSession?.state === 'completed') {
      setSessionComplete(true);
      triggerSessionCompleteConfetti();
      setTimeout(() => {
        setSessionComplete(false);
        createSession();
      }, 5000);
    }
  }, [currentSession?.state, createSession]);

  const handleStartSession = () => {
    if (settings.soundEnabled) {
      playStartSound(settings.soundVolume);
    }
    startSession();
    setShowPreFlight(false);
  };

  const handleCompleteTask = useCallback((early: boolean) => {
    if (early) {
      triggerConfetti();
      if (settings.soundEnabled) {
        playCompletionSound(settings.soundVolume);
      }
    }
    completeCurrentTask(early);
  }, [completeCurrentTask, settings.soundEnabled, settings.soundVolume]);

  const handlePasswordRequest = useCallback((action: 'extend' | 'pause', minutes?: number) => {
    setPasswordModal({ open: true, action, minutes });
  }, []);

  const handlePasswordSubmit = async (password: string): Promise<boolean> => {
    const isValid = await verifyPassword(password);
    if (isValid) {
      if (passwordModal.action === 'extend' && passwordModal.minutes) {
        addExtension(passwordModal.minutes);
        if (settings.soundEnabled) {
          playExtensionSound(settings.soundVolume);
        }
      } else if (passwordModal.action === 'pause') {
        emergencyPause();
        if (settings.soundEnabled) {
          playPauseSound(settings.soundVolume);
        }
      }
      setPasswordModal({ open: false, action: 'extend' });
    }
    return isValid;
  };

  const handleResume = async (password: string): Promise<boolean> => {
    const isValid = await verifyPassword(password);
    if (isValid) {
      resumeFromPause();
      setPasswordModal({ open: false, action: 'extend' });
    }
    return isValid;
  };

  const tasks = currentSession?.tasks || [];
  const currentTaskIndex = currentSession?.currentTaskIndex || 0;
  const currentTask = tasks[currentTaskIndex];
  const isRunning = currentSession?.state === 'running';
  const isPaused = currentSession?.state === 'paused';
  const isIdle = currentSession?.state === 'idle' || !currentSession;

  const totalHours = tasks.reduce((sum, t) => sum + t.durationHours, 0);
  const canStart = tasks.length > 0 && tasks.every(t => t.name && t.durationHours > 0);

  // Session complete view
  if (sessionComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="text-center space-y-6 max-w-md">
          <div className="text-6xl">🎉</div>
          <h2 className="text-3xl font-bold text-white">Session Complete!</h2>
          <p className="text-white/60">
            Great work! You completed all your tasks.
          </p>
        </GlassCard>
      </div>
    );
  }

  // Pre-flight confirmation
  if (showPreFlight) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard className="text-center space-y-6 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white">Ready to Start?</h2>
          <p className="text-white/60">
            You are committing to <span className="text-white font-semibold">{tasks.length} tasks</span> · <span className="text-white font-semibold">{formatHours(totalHours)}</span>
          </p>
          <div className="text-white/40 text-sm">
            Once started, you cannot go back.
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setShowPreFlight(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleStartSession} className="flex-1" size="lg">
              Start Session
            </Button>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Lockstep</h1>
          <div className="flex gap-2">
            <button
              onClick={() => onNavigate('history')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quote */}
        <QuoteDisplay quotes={settings.quotes} enabled={settings.quotesEnabled && isIdle} />

        {/* Timer (when running) */}
        {(isRunning || isPaused) && currentTask && (
          <GlassCard className="space-y-4">
            {isPaused ? (
              <div className="text-center space-y-6">
                <div className="text-6xl">⏸️</div>
                <h2 className="text-2xl font-bold text-white">Session Paused</h2>
                <p className="text-white/60">Enter your password to resume</p>
                <Button 
                  onClick={() => setPasswordModal({ open: true, action: 'pause' })}
                  className="mx-auto"
                  size="lg"
                >
                  Resume Session
                </Button>
              </div>
            ) : (
              <TimerDisplay
                task={currentTask}
                elapsedMs={elapsedMs}
                onComplete={handleCompleteTask}
                onExtend={addExtension}
                onPasswordRequest={handlePasswordRequest}
              />
            )}
          </GlassCard>
        )}

        {/* Task List */}
        <GlassCard>
          <TaskList
            tasks={tasks}
            currentTaskIndex={currentTaskIndex}
            isSessionActive={isRunning || isPaused}
            onAddTask={addTask}
            onUpdateTask={updateTask}
            onRemoveTask={removeTask}
            onReorderTasks={reorderTasks}
          />
        </GlassCard>

        {/* Action buttons */}
        {isIdle && tasks.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-900 to-transparent">
            <div className="max-w-2xl mx-auto">
              <Button
                onClick={() => setShowPreFlight(true)}
                disabled={!canStart}
                className="w-full"
                size="lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start Session ({formatHours(totalHours)})
              </Button>
            </div>
          </div>
        )}

        {/* Emergency pause button (when running) */}
        {isRunning && (
          <div className="fixed bottom-4 right-4">
            <button
              onClick={() => handlePasswordRequest('pause')}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-full 
                text-red-300 hover:text-red-200 transition-all border border-red-500/30"
              title="Emergency Pause"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Password Modal */}
      <PasswordModal
        isOpen={passwordModal.open}
        title={
          passwordModal.action === 'extend' 
            ? `Add ${passwordModal.minutes} minutes?`
            : isPaused
              ? 'Resume Session'
              : 'Emergency Pause'
        }
        description={
          passwordModal.action === 'extend'
            ? 'Enter your password to add extra time.'
            : isPaused
              ? 'Enter your password to continue.'
              : 'Enter your password and hold to pause. This will be logged.'
        }
        requireLongPress={passwordModal.action === 'pause' && !isPaused}
        longPressSeconds={settings.longPressSeconds}
        onSubmit={isPaused ? handleResume : handlePasswordSubmit}
        onCancel={() => setPasswordModal({ open: false, action: 'extend' })}
      />
    </div>
  );
}
