import { Session, Task } from '../types';
import { getTaskTotalDuration } from './time';

/**
 * Calculate and set scheduled times for all incomplete tasks in a session.
 * This is the single source of truth for when tasks should start/complete.
 * 
 * @param session - The session to update
 * @param effectiveStartTime - The base time to calculate from (accounts for pauses)
 * @param startFromIndex - Index to start calculating from (defaults to currentTaskIndex)
 * @returns Updated session with scheduled times set
 */
export function calculateScheduledTimes(
  session: Session,
  effectiveStartTime: number,
  startFromIndex?: number
): Session {
  const tasks = [...session.tasks];
  const startIdx = startFromIndex ?? session.currentTaskIndex;
  let currentTime = effectiveStartTime;

  for (let i = startIdx; i < tasks.length; i++) {
    const task = tasks[i];
    
    // Skip completed tasks - they keep their historical scheduled times
    if (task.status === 'completed') {
      continue;
    }

    const taskDuration = getTaskTotalDuration(task);
    
    tasks[i] = {
      ...task,
      scheduledStartAt: currentTime,
      scheduledCompleteAt: currentTime + taskDuration
    };

    currentTime += taskDuration;
  }

  return { ...session, tasks };
}

/**
 * Calculate the effective start time for scheduling, accounting for all pauses.
 * 
 * @param session - The session to calculate from
 * @returns Effective start time with pause durations added
 */
export function getEffectiveStartTime(session: Session): number {
  if (!session.startedAt) return Date.now();
  
  // Calculate total pause duration
  const totalPauseDuration = session.pauseEvents.reduce((total, pause) => {
    if (pause.resumedAt) {
      return total + (pause.resumedAt - pause.pausedAt);
    }
    return total;
  }, 0);

  return session.startedAt + totalPauseDuration;
}

/**
 * Check tasks against scheduled times and return the current active task index
 * and which tasks should be marked as completed.
 * 
 * @param session - The session to check
 * @param now - Current timestamp
 * @returns Object with completedIndices and activeIndex
 */
export function getTaskStatusFromSchedule(
  session: Session,
  now: number
): { completedIndices: number[]; activeIndex: number } {
  const completedIndices: number[] = [];
  let activeIndex = session.currentTaskIndex;

  for (let i = session.currentTaskIndex; i < session.tasks.length; i++) {
    const task = session.tasks[i];
    
    if (task.status === 'completed') continue;
    
    if (task.scheduledCompleteAt && now >= task.scheduledCompleteAt) {
      completedIndices.push(i);
      activeIndex = i + 1;
    } else {
      // Found the active task
      break;
    }
  }

  return { completedIndices, activeIndex };
}

/**
 * Calculate elapsed time for the current active task based on scheduled start time.
 * Falls back to startedAt if scheduledStartAt is not available.
 * 
 * @param task - The current active task
 * @param now - Current timestamp
 * @returns Elapsed milliseconds, or 0 if not calculable
 */
export function getElapsedForTask(task: Task, now: number): number {
  // Use scheduledStartAt as primary, fall back to startedAt
  const startTime = task.scheduledStartAt ?? task.startedAt;
  if (!startTime) return 0;
  return Math.max(0, now - startTime);
}