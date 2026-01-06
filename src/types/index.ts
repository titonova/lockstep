// Visual intensity modes
export type VisualMode = 'calm' | 'standard' | 'aggressive';

// Task status
export type TaskStatus = 'pending' | 'active' | 'completed' | 'skipped';

// A single task in the todo list
export interface Task {
  id: string;
  name: string;
  durationHours: number; // Duration in decimal hours (e.g., 1.5)
  notes?: string;
  status: TaskStatus;
  // Runtime tracking
  startedAt?: number; // Timestamp when task started
  completedAt?: number; // Timestamp when task completed
  timeSpentMs?: number; // Actual time spent
  extensions: Extension[]; // Time extensions applied
  completedEarly?: boolean; // Whether completed before time ran out
}

// Time extension record
export interface Extension {
  id: string;
  minutes: number;
  appliedAt: number; // Timestamp
}

// Session state
export type SessionState = 'idle' | 'running' | 'paused' | 'completed';

// Emergency pause event
export interface PauseEvent {
  id: string;
  pausedAt: number;
  resumedAt?: number;
  reason?: string;
}

// A complete session for a day
export interface Session {
  id: string;
  date: string; // ISO date string (YYYY-MM-DD)
  tasks: Task[];
  state: SessionState;
  startedAt?: number;
  completedAt?: number;
  currentTaskIndex: number;
  pauseEvents: PauseEvent[];
  totalPlannedMs: number;
  totalActualMs: number;
}

// Daily summary for history
export interface DailySummary {
  date: string;
  tasksPlanned: number;
  tasksCompleted: number;
  plannedTimeMs: number;
  actualTimeMs: number;
  extensionsUsed: number;
  pausesUsed: number;
  sessions: Session[];
}

// Motivational quote
export interface Quote {
  id: string;
  text: string;
  author?: string;
  isDefault?: boolean;
}

// User settings
export interface Settings {
  passwordHash: string;
  visualMode: VisualMode;
  quotesEnabled: boolean;
  quotes: Quote[];
  soundEnabled: boolean;
  soundVolume: number; // 0-1
  extensionThresholdPercent: number; // Default 10%
  longPressSeconds: number; // Default 5
  onboardingCompleted: boolean;
}

// App state
export interface AppState {
  settings: Settings;
  currentSession: Session | null;
  history: DailySummary[];
}
