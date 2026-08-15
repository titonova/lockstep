import { useState, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { GlassCard } from '../components/GlassCard';
import { TaskList } from '../components/TaskList';
import { TimerDisplay } from '../components/TimerDisplay';
import { PasswordModal } from '../components/PasswordModal';
import { QuoteDisplay } from '../components/QuoteDisplay';
import { PinnedTasksPanel } from '../components/PinnedTasksPanel';
import { Button } from '../components/Button';
import { formatHours, hoursToMs, minutesToMs, formatTime, getTodayDate } from '../utils/time';
import { playStartSound, playCompletionSound, playExtensionSound, playPauseSound } from '../utils/audio';
import { triggerConfetti, triggerSessionCompleteConfetti } from '../components/Confetti';
import { Task } from '../types';

interface MainPageProps {
  onNavigate: (page: 'history' | 'settings') => void;
}

function getNextDate(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(year, month - 1, day + 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(nextDate.getDate()).padStart(2, '0')}`;
}

export function MainPage({ onNavigate }: MainPageProps) {
  const {
    settings,
    currentSession,
    plannedSessions,
    pinnedTasks,
    timerActive,
    elapsedMs,
    createSession,
    addTask,
    addTaskForDate,
    updateTask,
    updateTaskForDate,
    removeTask,
    removeTaskForDate,
    moveTaskToDate,
    reorderTasks,
    reorderTasksForDate,
    addPinnedTask,
    updatePinnedTask,
    removePinnedTask,
    addPinnedTasksToSession,
    addPinnedTasksToDate,
    setPlanAutoStart,
    reconcilePlans,
    startSession,
    completeCurrentTask,
    tick,
    addExtension,
    emergencyPause,
    resumeFromPause,
    verifyPassword,
    forceRestartTimer,
    restartSession
  } = useStore();

  const [showPreFlight, setShowPreFlight] = useState(false);
  const [passwordModal, setPasswordModal] = useState<{
    open: boolean;
    action: 'extend' | 'pause' | 'restart' | 'stop';
    minutes?: number;
    clearTasks?: boolean;
  }>({ open: false, action: 'extend' });
  const [showRestartChoice, setShowRestartChoice] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showPinnedTasksPanel, setShowPinnedTasksPanel] = useState(false);
  const [showPlanningControls, setShowPlanningControls] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [movingTask, setMovingTask] = useState<Task | null>(null);
  const [moveDestinationDate, setMoveDestinationDate] = useState('');
  const [moveError, setMoveError] = useState<string | null>(null);

  // Reconcile dated plans on load, focus, and while the app remains open.
  useEffect(() => {
    reconcilePlans();
    const handleVisibility = () => { if (document.visibilityState === 'visible') reconcilePlans(); };
    window.addEventListener('focus', reconcilePlans);
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = window.setInterval(reconcilePlans, 30000);
    return () => {
      window.removeEventListener('focus', reconcilePlans);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.clearInterval(interval);
    };
  }, [reconcilePlans]);

  // Create today's empty session only after dated-plan reconciliation.
  useEffect(() => {
    if (!currentSession && selectedDate === getTodayDate() && !plannedSessions.some(plan => plan.date === getTodayDate())) {
      createSession();
    }
  }, [currentSession, plannedSessions, createSession, selectedDate]);

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
      } else if (passwordModal.action === 'restart') {
        restartSession('restart', passwordModal.clearTasks || false);
        if (settings.soundEnabled) {
          playStartSound(settings.soundVolume);
        }
      } else if (passwordModal.action === 'stop') {
        restartSession('stop', passwordModal.clearTasks || false);
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

  const selectedPlan = selectedDate === getTodayDate()
    ? currentSession
    : plannedSessions.find(plan => plan.date === selectedDate) || null;
  const tasks = selectedPlan?.tasks || [];
  const currentTaskIndex = selectedPlan?.currentTaskIndex || 0;
  const currentTask = tasks[currentTaskIndex];
  const isToday = selectedDate === getTodayDate();
  const isRunning = isToday && currentSession?.state === 'running';
  const isPaused = isToday && currentSession?.state === 'paused';
  const isIdle = isToday && (currentSession?.state === 'idle' || !currentSession);
  const isFuturePlan = selectedDate > getTodayDate();
  const isReadOnlyDate = selectedDate < getTodayDate();
  const planAutoStart = selectedPlan?.autoStart || false;

  const handleAddTask = (name: string, durationHours: number, notes?: string) => {
    if (isToday) addTask(name, durationHours, notes);
    else addTaskForDate(selectedDate, name, durationHours, notes);
  };
  const handleUpdateTask = (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => {
    if (isToday) updateTask(id, updates);
    else updateTaskForDate(selectedDate, id, updates);
  };
  const handleRemoveTask = (id: string) => {
    if (isToday) removeTask(id);
    else removeTaskForDate(selectedDate, id);
  };
  const handleReorderTasks = (fromIndex: number, toIndex: number) => {
    if (isToday) reorderTasks(fromIndex, toIndex);
    else reorderTasksForDate(selectedDate, fromIndex, toIndex);
  };
  const handleMoveTask = (id: string) => {
    const task = tasks.find(item => item.id === id);
    if (!task) return;
    setMovingTask(task);
    setMoveDestinationDate(getNextDate(selectedDate));
    setMoveError(null);
  };
  const confirmMoveTask = () => {
    if (!movingTask || !moveDestinationDate || moveDestinationDate === selectedDate) return;
    const moved = moveTaskToDate(selectedDate, moveDestinationDate, movingTask.id);
    if (!moved) {
      setMoveError('This task could not be moved. The source or destination session may have changed.');
      return;
    }
    setMovingTask(null);
  };

  const totalHours = tasks.reduce((sum, t) => sum + t.durationHours, 0);
  const canStart = tasks.length > 0 && tasks.every(t => t.name && t.durationHours > 0);

  // Update page title with remaining time
  useEffect(() => {
    if (isRunning && currentTask) {
      const baseMs = hoursToMs(currentTask.durationHours);
      const extensionMs = currentTask.extensions.reduce((sum, ext) => sum + minutesToMs(ext.minutes), 0);
      const totalMs = baseMs + extensionMs;
      const remainingMs = Math.max(0, totalMs - elapsedMs);
      const timeString = formatTime(remainingMs);
      document.title = `${timeString} - Lockstep`;
    } else {
      document.title = 'Lockstep - Deep Work Timer';
    }
  }, [isRunning, currentTask, elapsedMs]);

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
              onClick={() => setShowPinnedTasksPanel(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </button>
            <button
              onClick={() => setShowPlanningControls(prev => !prev)}
              className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${showPlanningControls ? 'text-white bg-white/10' : 'text-white/60 hover:text-white'}`}
              aria-label="Show planning date"
              title="Plan for another day"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="17" rx="2" strokeWidth={2} />
                <path strokeLinecap="round" strokeWidth={2} d="M16 2v4M8 2v4M3 10h18" />
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

        {/* Plan date */}
        {showPlanningControls && <GlassCard className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-white/50">Planning day</p>
              <p className="text-white font-semibold">
                {isToday ? 'Today' : new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
              </p>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value || getTodayDate())}
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white"
            />
          </div>
          {isFuturePlan && (
            <label className="flex items-center gap-3 text-sm text-white/70">
              <input
                type="checkbox"
                checked={planAutoStart}
                disabled={!selectedPlan || tasks.length === 0}
                onChange={(event) => setPlanAutoStart(selectedDate, event.target.checked)}
                className="h-4 w-4 rounded"
              />
              Start automatically when this day arrives
            </label>
          )}
          {!isToday && !selectedPlan && (
            <p className="text-sm text-white/40">Add tasks to create a plan for this day.</p>
          )}
        </GlassCard>}

        {/* Quote */}
        <QuoteDisplay quotes={settings.quotes} enabled={settings.quotesEnabled} />

        {/* Timer (when running) */}
        {(isRunning || isPaused) && currentTask && (
          <GlassCard className="space-y-4">
            {isPaused ? (
              <div className="text-center space-y-6">
                <div className="text-6xl">⏸️</div>
                <h2 className="text-2xl font-bold text-white">Session Paused</h2>
                <p className="text-white/60">Resume when you're ready to continue.</p>
                <Button 
                  onClick={() => resumeFromPause()}
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
            elapsedMs={elapsedMs}
            isReadOnly={isReadOnlyDate}
            onAddTask={handleAddTask}
            onUpdateTask={handleUpdateTask}
            onRemoveTask={handleRemoveTask}
            onMoveTask={handleMoveTask}
            onReorderTasks={handleReorderTasks}
          />
        </GlassCard>

        {movingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <GlassCard className="w-full max-w-md space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">Move task</h2>
                <p className="mt-1 text-sm text-white/60">Move <span className="font-medium text-white">{movingTask.name}</span> to another day.</p>
              </div>
              <input
                type="date"
                min={getTodayDate()}
                value={moveDestinationDate}
                onChange={(event) => {
                  setMoveDestinationDate(event.target.value);
                  setMoveError(null);
                }}
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-white"
              />
              {moveError && <p className="text-sm text-red-300">{moveError}</p>}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => { setMovingTask(null); setMoveError(null); }}>Cancel</Button>
                <Button onClick={confirmMoveTask} disabled={!moveDestinationDate || moveDestinationDate === selectedDate || (moveDestinationDate === getTodayDate() && currentSession?.state !== 'idle')}>Move task</Button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Action buttons */}
        {isIdle && tasks.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#080c14] to-transparent">
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
          <div className="fixed bottom-4 right-4 flex gap-2">
            {/* Restart button */}
            <button
              onClick={() => setShowRestartChoice(true)}
              className="p-3 bg-red-500/20 hover:bg-red-500/30 rounded-full 
                text-red-300 hover:text-red-200 transition-all border border-red-500/30"
              title="Restart Session"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            {/* Force restart button - visible when timer appears frozen */}
            {elapsedMs === 0 && timerActive && (
              <button
                onClick={forceRestartTimer}
                className="p-3 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-full 
                  text-yellow-300 hover:text-yellow-200 transition-all border border-yellow-500/30"
                title="Force Restart Timer (use if timer is frozen)"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            )}
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
            : passwordModal.action === 'restart'
              ? 'Restart Session'
              : passwordModal.action === 'stop'
                ? 'Stop Session'
                : isPaused
                  ? 'Resume Session'
                  : 'Emergency Pause'
        }
        description={
          passwordModal.action === 'restart' || passwordModal.action === 'stop'
            ? `Enter your password to confirm session ${passwordModal.action}.`
            : passwordModal.action === 'extend'
              ? 'Enter your password to add extra time.'
              : isPaused
                ? 'Enter your password to continue.'
                : 'Enter your password and hold to pause. This will be logged.'
        }
        requireLongPress={(passwordModal.action === 'pause' && !isPaused) || passwordModal.action === 'restart' || passwordModal.action === 'stop'}
        longPressSeconds={settings.longPressSeconds}
        onSubmit={isPaused ? handleResume : handlePasswordSubmit}
        onCancel={() => setPasswordModal({ open: false, action: 'extend' })}
      />

      {/* Restart Choice Modal */}
      {showRestartChoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowRestartChoice(false)}
          />
          <GlassCard className="relative w-full max-w-md space-y-6">
            <h2 className="text-2xl font-bold text-white text-center">Modify Session?</h2>
            <p className="text-white/60 text-center">
              What would you like to do with the current session?
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => {
                  setShowRestartChoice(false);
                  setPasswordModal({ open: true, action: 'restart', clearTasks: false });
                }}
                className="w-full"
              >
                Restart Now (Timer to 0)
              </Button>
              <Button 
                variant="secondary"
                onClick={() => {
                  setShowRestartChoice(false);
                  setPasswordModal({ open: true, action: 'stop', clearTasks: false });
                }}
                className="w-full"
              >
                Stop & Plan (Return to Idle)
              </Button>
              <div className="pt-2 border-t border-white/10">
                <Button 
                  variant="ghost"
                  onClick={() => {
                    setShowRestartChoice(false);
                    setPasswordModal({ open: true, action: 'stop', clearTasks: true });
                  }}
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Clear All & Reset App
                </Button>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setShowRestartChoice(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Pinned Tasks Panel */}
        <PinnedTasksPanel
        pinnedTasks={pinnedTasks}
        isOpen={showPinnedTasksPanel}
        onClose={() => setShowPinnedTasksPanel(false)}
        onAddPinnedTask={addPinnedTask}
        onUpdatePinnedTask={updatePinnedTask}
        onRemovePinnedTask={removePinnedTask}
        onAddToSession={(taskIds) => isToday ? addPinnedTasksToSession(taskIds) : addPinnedTasksToDate(selectedDate, taskIds)}
      />
    </div>
  );
}
