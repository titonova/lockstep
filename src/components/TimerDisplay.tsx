import { useEffect, useState } from 'react';
import { formatTime, hoursToMs, minutesToMs, getRemainingPercent, getTimerColor, shouldShowExtensions } from '../utils/time';
import { useStore } from '../store';
import { Task } from '../types';

interface TimerDisplayProps {
  task: Task;
  elapsedMs: number;
  onComplete: (early: boolean) => void;
  onExtend: (minutes: number) => void;
  onPasswordRequest: (action: 'extend' | 'pause', minutes?: number) => void;
}

export function TimerDisplay({ 
  task, 
  elapsedMs, 
  onComplete,
  onPasswordRequest 
}: TimerDisplayProps) {
  const settings = useStore(state => state.settings);
  const [showExtensions, setShowExtensions] = useState(false);

  // Calculate total task time including extensions
  const baseMs = hoursToMs(task.durationHours);
  const extensionMs = task.extensions.reduce((sum, ext) => sum + minutesToMs(ext.minutes), 0);
  const totalMs = baseMs + extensionMs;
  
  const remainingMs = Math.max(0, totalMs - elapsedMs);
  const remainingPercent = getRemainingPercent(elapsedMs, totalMs);
  const timerColor = getTimerColor(remainingPercent);

  // Check if extensions should show
  useEffect(() => {
    const shouldShow = shouldShowExtensions(
      remainingPercent,
      settings.extensionThresholdPercent,
      task.extensions.length
    );
    setShowExtensions(shouldShow);
  }, [remainingPercent, settings.extensionThresholdPercent, task.extensions.length]);

  const colorClasses = {
    green: 'text-green-400',
    orange: 'text-orange-400',
    red: 'text-red-400'
  };

  const bgColorClasses = {
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  const isCompleted = task.completedEarly;
  const urgencyClass = remainingPercent <= 5 && settings.visualMode !== 'calm' ? 'urgency-flash' : '';

  return (
    <div className="text-center space-y-6">
      {/* Task name */}
      <div>
        <h2 className="text-2xl font-semibold text-white/90 mb-2">{task.name}</h2>
        {task.notes && (
          <p className="text-white/50 text-sm">{task.notes}</p>
        )}
      </div>

      {/* Timer display */}
      <div className={`${urgencyClass}`}>
        <div className={`text-7xl font-mono font-bold ${isCompleted ? 'text-green-400' : colorClasses[timerColor]} transition-colors duration-500`}>
          {isCompleted ? (
            <span className="text-5xl">✓ Extra Time</span>
          ) : (
            formatTime(remainingMs)
          )}
        </div>
        {!isCompleted && (
          <div className="text-white/40 text-sm mt-2">
            {formatTime(elapsedMs)} elapsed
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${bgColorClasses[timerColor]} progress-bar rounded-full`}
          style={{ width: `${100 - remainingPercent}%` }}
        />
      </div>

      {/* Extensions display */}
      {task.extensions.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {task.extensions.map((ext) => (
            <span 
              key={ext.id}
              className="px-2 py-1 text-xs bg-white/10 rounded-full text-white/60"
            >
              +{ext.minutes}m
            </span>
          ))}
        </div>
      )}

      {/* Extension buttons */}
      {showExtensions && !isCompleted && (
        <div className="space-y-2">
          <p className="text-white/40 text-sm">Need more time?</p>
          <div className="flex justify-center gap-3">
            {[30, 45, 60].map(minutes => (
              <button
                key={minutes}
                onClick={() => onPasswordRequest('extend', minutes)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white/80 
                  hover:text-white transition-all border border-white/10 hover:border-white/20"
              >
                +{minutes}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Complete early button */}
      {!isCompleted && (
        <button
          onClick={() => onComplete(true)}
          className="px-6 py-3 bg-green-500/20 hover:bg-green-500/30 rounded-xl 
            text-green-300 hover:text-green-200 transition-all border border-green-500/30"
        >
          ✓ Mark Complete
        </button>
      )}

      {isCompleted && (
        <div className="text-green-400/80">
          <p>Completed early! Timer continues until time expires...</p>
        </div>
      )}
    </div>
  );
}
