import { AppState, DailySummary, Session, Settings } from '../types';
import { DEFAULT_QUOTES } from '../data/quotes';

const STORAGE_KEY = 'lockstep_data';

/**
 * Get default settings
 */
export function getDefaultSettings(): Settings {
  return {
    passwordHash: '',
    visualMode: 'standard',
    quotesEnabled: true,
    quotes: DEFAULT_QUOTES,
    soundEnabled: true,
    soundVolume: 0.5,
    extensionThresholdPercent: 10,
    longPressSeconds: 5,
    onboardingCompleted: false
  };
}

/**
 * Load app state from localStorage
 */
export function loadState(): AppState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        settings: { ...getDefaultSettings(), ...parsed.settings },
        currentSession: parsed.currentSession || null,
        history: parsed.history || [],
        timerActive: parsed.timerActive || false,
        elapsedMs: parsed.elapsedMs || 0,
        lastTickTime: parsed.lastTickTime || null
      };
    }
  } catch (error) {
    console.error('Failed to load state:', error);
  }
  return {
    settings: getDefaultSettings(),
    currentSession: null,
    history: [],
    timerActive: false,
    elapsedMs: 0,
    lastTickTime: null
  };
}

/**
 * Save app state to localStorage
 */
export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
  }
}

/**
 * Export all data as JSON
 */
export function exportData(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Import data from JSON
 */
export function importData(json: string): AppState | null {
  try {
    const data = JSON.parse(json);
    // Validate basic structure
    if (data.settings && typeof data.settings === 'object') {
      return {
        settings: { ...getDefaultSettings(), ...data.settings },
        currentSession: data.currentSession || null,
        history: data.history || [],
        timerActive: data.timerActive || false,
        elapsedMs: data.elapsedMs || 0,
        lastTickTime: data.lastTickTime || null
      };
    }
  } catch (error) {
    console.error('Failed to import data:', error);
  }
  return null;
}

/**
 * Get or create daily summary for a date
 */
export function getDailySummary(history: DailySummary[], date: string): DailySummary {
  const existing = history.find(s => s.date === date);
  if (existing) return existing;
  return {
    date,
    tasksPlanned: 0,
    tasksCompleted: 0,
    plannedTimeMs: 0,
    actualTimeMs: 0,
    extensionsUsed: 0,
    pausesUsed: 0,
    sessions: []
  };
}

/**
 * Update daily summary with completed session
 */
export function updateDailySummary(
  history: DailySummary[],
  session: Session
): DailySummary[] {
  const date = session.date;
  const existingIndex = history.findIndex(s => s.date === date);
  
  const summary: DailySummary = existingIndex >= 0
    ? { ...history[existingIndex] }
    : {
        date,
        tasksPlanned: 0,
        tasksCompleted: 0,
        plannedTimeMs: 0,
        actualTimeMs: 0,
        extensionsUsed: 0,
        pausesUsed: 0,
        sessions: []
      };

  // Update stats from session
  summary.tasksPlanned += session.tasks.length;
  summary.tasksCompleted += session.tasks.filter(t => t.status === 'completed').length;
  summary.plannedTimeMs += session.totalPlannedMs;
  summary.actualTimeMs += session.totalActualMs;
  summary.extensionsUsed += session.tasks.reduce((sum, t) => sum + t.extensions.length, 0);
  summary.pausesUsed += session.pauseEvents.length;
  summary.sessions = [...summary.sessions, session];

  if (existingIndex >= 0) {
    const newHistory = [...history];
    newHistory[existingIndex] = summary;
    return newHistory;
  }
  return [...history, summary];
}

/**
 * Clear all data (reset app)
 */
export function clearAllData(): void {
  localStorage.removeItem(STORAGE_KEY);
}
