import { describe, expect, it } from 'vitest';
import type { Session, Task } from '../types';
import { reconcileSessionTimer } from './timer';

const hour = 60 * 60 * 1000;

function task(id: string): Task {
  return { id, name: id, durationHours: 1, status: 'pending', extensions: [] };
}

function runningSession(startedAt: number, tasks: Task[], pauseEvents: Session['pauseEvents'] = []): Session {
  return {
    id: 'session', date: '2026-10-01', state: 'running', startedAt,
    currentTaskIndex: 0, pauseEvents, totalPlannedMs: tasks.length * hour,
    totalActualMs: 0,
    tasks: tasks.map((item, index) => ({ ...item, status: index === 0 ? 'active' : 'pending', startedAt: index === 0 ? startedAt : undefined }))
  };
}

describe('reconcileSessionTimer', () => {
  it('catches up across a background gap without needing intermediate ticks', () => {
    const start = 1_000_000;
    const result = reconcileSessionTimer(runningSession(start, [task('one'), task('two'), task('three')]), start + hour + 15 * 60_000);

    expect(result.session.tasks[0]).toMatchObject({ status: 'completed', completedAt: start + hour });
    expect(result.session.tasks[1]).toMatchObject({ status: 'active', startedAt: start + hour });
    expect(result.elapsedMs).toBe(15 * 60_000);
  });

  it('advances through every task missed while the page was suspended', () => {
    const start = 1_000_000;
    const result = reconcileSessionTimer(runningSession(start, [task('one'), task('two')]), start + 3 * hour);

    expect(result.sessionComplete).toBe(true);
    expect(result.session.tasks.map(item => item.status)).toEqual(['completed', 'completed']);
    expect(result.session.tasks[1].completedAt).toBe(start + 2 * hour);
  });

  it('excludes recorded pauses when catching up after backgrounding', () => {
    const start = 1_000_000;
    const result = reconcileSessionTimer(
      runningSession(start, [task('one'), task('two')], [{ id: 'pause', pausedAt: start + 30 * 60_000, resumedAt: start + 50 * 60_000 }]),
      start + 90 * 60_000
    );

    expect(result.session.tasks[0]).toMatchObject({ status: 'completed', completedAt: start + 80 * 60_000 });
    expect(result.session.tasks[1]).toMatchObject({ status: 'active', startedAt: start + 80 * 60_000 });
    expect(result.elapsedMs).toBe(10 * 60_000);
  });

  it('does not advance through an open emergency pause', () => {
    const start = 1_000_000;
    const session = runningSession(start, [task('one')], [{ id: 'pause', pausedAt: start + 30 * 60_000 }]);
    session.state = 'paused';
    const result = reconcileSessionTimer(session, start + 5 * hour);

    expect(result.sessionComplete).toBe(false);
    expect(result.elapsedMs).toBe(30 * 60_000);
  });
});
