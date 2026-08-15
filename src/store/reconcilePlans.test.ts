import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState, Session, Task } from '../types';

vi.mock('../utils/storage', () => ({
  loadState: (): AppState => ({
    settings: {
      passwordHash: '',
      visualMode: 'standard',
      quotesEnabled: true,
      quotes: [],
      soundEnabled: true,
      soundVolume: 0.5,
      extensionThresholdPercent: 10,
      longPressSeconds: 5,
      onboardingCompleted: true
    },
    currentSession: null,
    plannedSessions: [],
    history: [],
    pinnedTasks: [],
    timerActive: false,
    elapsedMs: 0,
    lastTickTime: null
  }),
  saveState: vi.fn(),
  getDefaultSettings: () => ({
    passwordHash: '',
    visualMode: 'standard',
    quotesEnabled: true,
    quotes: [],
    soundEnabled: true,
    soundVolume: 0.5,
    extensionThresholdPercent: 10,
    longPressSeconds: 5,
    onboardingCompleted: true
  }),
  updateDailySummary: vi.fn()
}));

import { useStore } from './index';
import { getTodayDate } from '../utils/time';

const makeTask = (id: string): Task => ({
  id,
  name: `Task ${id}`,
  durationHours: 1,
  status: 'pending',
  extensions: []
});

const makeSession = (id: string, date: string, state: Session['state'] = 'idle', autoStart = false): Session => ({
  id,
  date,
  tasks: [makeTask(`${id}-task`)],
  state,
  currentTaskIndex: 0,
  pauseEvents: [],
  totalPlannedMs: 3_600_000,
  totalActualMs: 0,
  autoStart
});

describe('reconcilePlans', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-15T12:00:00+01:00'));
    useStore.setState({
      currentSession: null,
      plannedSessions: [],
      history: [],
      pinnedTasks: [],
      timerActive: false,
      elapsedMs: 0,
      lastTickTime: null
    });
  });

  it('promotes today\'s plan into the current session and removes only that plan', () => {
    const todayPlan = makeSession('today-plan', '2026-08-15');
    const futurePlan = makeSession('future-plan', '2026-08-16');
    useStore.setState({ plannedSessions: [todayPlan, futurePlan] });

    useStore.getState().reconcilePlans();

    expect(useStore.getState().currentSession).toMatchObject({ id: 'today-plan', date: '2026-08-15' });
    expect(useStore.getState().plannedSessions).toEqual([futurePlan]);
  });

  it('retains yesterday\'s idle tasks as a dated plan before promoting today\'s plan', () => {
    const yesterdaySession = makeSession('yesterday-session', '2026-08-14');
    const todayPlan = makeSession('today-plan', '2026-08-15');
    useStore.setState({ currentSession: yesterdaySession, plannedSessions: [todayPlan] });

    useStore.getState().reconcilePlans();

    expect(useStore.getState().currentSession).toMatchObject({ id: 'today-plan' });
    expect(useStore.getState().plannedSessions).toEqual([yesterdaySession]);
  });

  it('does not replace an existing running session with today\'s plan', () => {
    const runningSession = makeSession('running-session', '2026-08-14', 'running');
    const todayPlan = makeSession('today-plan', '2026-08-15');
    useStore.setState({ currentSession: runningSession, plannedSessions: [todayPlan] });

    useStore.getState().reconcilePlans();

    expect(useStore.getState().currentSession).toEqual(runningSession);
    expect(useStore.getState().plannedSessions).toEqual([todayPlan]);
  });

  it('starts an auto-start plan when it is promoted', () => {
    const todayPlan = makeSession('today-plan', '2026-08-15', 'idle', true);
    useStore.setState({ plannedSessions: [todayPlan] });

    useStore.getState().reconcilePlans();

    expect(useStore.getState().currentSession).toMatchObject({ state: 'running', currentTaskIndex: 0 });
    expect(useStore.getState().currentSession?.tasks[0]).toMatchObject({ status: 'active' });
    expect(useStore.getState().timerActive).toBe(true);
  });

  it('moves an idle task to another day and updates both plans', () => {
    const currentSession = makeSession('current-session', '2026-08-15');
    useStore.setState({ currentSession });

    expect(getTodayDate()).toBe('2026-08-15');
    expect(useStore.getState().currentSession?.state).toBe('idle');
    expect(useStore.getState().currentSession?.tasks[0].id).toBe('current-session-task');

    const moved = useStore.getState().moveTaskToDate('2026-08-15', '2026-08-16', 'current-session-task');

    expect(useStore.getState().currentSession?.tasks).toEqual([]);
    expect(useStore.getState().currentSession?.totalPlannedMs).toBe(0);
    expect(useStore.getState().plannedSessions).toHaveLength(1);
    expect(useStore.getState().plannedSessions[0]).toMatchObject({ date: '2026-08-16', tasks: [makeTask('current-session-task')] });
    expect(moved).toBe(true);
  });

  it('moves a dated plan without modifying an older active session', () => {
    vi.setSystemTime(new Date('2026-08-16T12:00:00+01:00'));
    const runningSession = makeSession('running-session', '2026-08-15', 'running');
    const todayPlan = makeSession('today-plan', '2026-08-16');
    useStore.setState({ currentSession: runningSession, plannedSessions: [todayPlan] });

    const moved = useStore.getState().moveTaskToDate('2026-08-16', '2026-08-17', 'today-plan-task');

    expect(moved).toBe(true);
    expect(useStore.getState().currentSession).toEqual(runningSession);
    expect(useStore.getState().plannedSessions).toHaveLength(1);
    expect(useStore.getState().plannedSessions[0]).toMatchObject({ date: '2026-08-17', tasks: [makeTask('today-plan-task')] });
  });
});
