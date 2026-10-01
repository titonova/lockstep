import type { PauseEvent, Session, Task } from '../types';
import { getTaskTotalDuration } from './time';

/**
 * The timer's source of truth is wall-clock time plus recorded pause events.
 * Browser intervals only ask React to repaint; they never advance time.
 */
function pauseEnd(pause: PauseEvent, now: number): number {
  return pause.resumedAt ?? now;
}

export function elapsedWorkingTime(task: Task, session: Session, now: number): number {
  const startedAt = task.startedAt ?? task.scheduledStartAt;
  if (startedAt === undefined) return 0;

  const end = Math.max(startedAt, task.completedAt ?? now);
  const pausedMs = session.pauseEvents.reduce((total, pause) => {
    const overlapStart = Math.max(startedAt, pause.pausedAt);
    const overlapEnd = Math.min(end, pauseEnd(pause, now));
    return total + Math.max(0, overlapEnd - overlapStart);
  }, 0);

  return Math.max(0, end - startedAt - pausedMs);
}

/** Return the wall-clock moment at which a task reaches its working duration. */
export function taskDeadline(task: Task, session: Session, startedAt: number, now: number): number {
  let remaining = getTaskTotalDuration(task);
  let cursor = startedAt;
  const pauses = [...session.pauseEvents].sort((a, b) => a.pausedAt - b.pausedAt);

  for (const pause of pauses) {
    const end = pauseEnd(pause, now);
    if (end <= cursor) continue;

    if (pause.pausedAt > cursor) {
      const workingBeforePause = pause.pausedAt - cursor;
      if (remaining <= workingBeforePause) return cursor + remaining;
      remaining -= workingBeforePause;
    }

    // An open pause prevents the task from reaching its deadline.
    if (!pause.resumedAt) return Number.POSITIVE_INFINITY;
    cursor = Math.max(cursor, end);
  }

  return cursor + remaining;
}

export interface ReconciledSession {
  session: Session;
  elapsedMs: number;
  stateChanged: boolean;
  sessionComplete: boolean;
}

/**
 * Derive and persist only genuine state transitions caused by real elapsed time.
 * This works equally after a one-second repaint or after a browser suspension.
 */
export function reconcileSessionTimer(session: Session, now: number): ReconciledSession {
  if (session.state !== 'running') {
    const current = session.tasks[session.currentTaskIndex];
    return { session, elapsedMs: current ? elapsedWorkingTime(current, session, now) : 0, stateChanged: false, sessionComplete: false };
  }

  // Older builds could persist a session as running while leaving its last
  // pause open. That makes every new second count as paused and freezes elapsed
  // time at zero forever. A running session is authoritative, so close those
  // orphaned records as zero-duration compatibility events.
  const hasOrphanedPause = session.pauseEvents.some(pause => pause.resumedAt === undefined);
  const workingSession: Session = hasOrphanedPause
    ? {
        ...session,
        pauseEvents: session.pauseEvents.map(pause => pause.resumedAt === undefined
          ? { ...pause, resumedAt: pause.pausedAt }
          : pause)
      }
    : session;

  const tasks = [...workingSession.tasks];
  let currentIndex = session.currentTaskIndex;
  let stateChanged = hasOrphanedPause;

  while (currentIndex < tasks.length) {
    const current = tasks[currentIndex];
    const startedAt = current.startedAt ?? current.scheduledStartAt ?? now;
    const deadline = taskDeadline(current, workingSession, startedAt, now);

    if (now < deadline) {
      tasks[currentIndex] = {
        ...current,
        status: 'active',
        startedAt,
        // Retain this legacy field only for backwards-compatible imports.
        scheduledStartAt: startedAt
      };
      const reconciled = { ...workingSession, tasks, currentTaskIndex: currentIndex };
      return {
        session: reconciled,
        elapsedMs: elapsedWorkingTime(tasks[currentIndex], reconciled, now),
        stateChanged,
        sessionComplete: false
      };
    }

    const duration = getTaskTotalDuration(current);
    tasks[currentIndex] = {
      ...current,
      status: 'completed',
      startedAt,
      completedAt: deadline,
      timeSpentMs: duration,
      completedEarly: false
    };
    stateChanged = true;
    currentIndex += 1;

    if (currentIndex < tasks.length) {
      tasks[currentIndex] = {
        ...tasks[currentIndex],
        status: 'active',
        startedAt: deadline,
        scheduledStartAt: deadline
      };
    }
  }

  return {
    session: { ...workingSession, tasks, currentTaskIndex: currentIndex, state: 'completed', completedAt: now },
    elapsedMs: 0,
    stateChanged,
    sessionComplete: true
  };
}
