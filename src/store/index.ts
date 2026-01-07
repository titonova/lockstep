import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import {
  AppState,
  Task,
  Session,
  Settings,
  Extension,
  PauseEvent,
  Quote,
  VisualMode
} from '../types';
import {
  loadState,
  saveState,
  getDefaultSettings,
  updateDailySummary
} from '../utils/storage';
import {
  generateId,
  getTodayDate,
  hoursToMs,
  minutesToMs
} from '../utils/time';
import { hashPassword, verifyPassword } from '../utils/crypto';

interface StoreState extends AppState {
  // Timer state
  timerActive: boolean;
  elapsedMs: number;
  lastTickTime: number | null;
  
  // Settings actions
  setPassword: (password: string) => Promise<void>;
  verifyPassword: (password: string) => Promise<boolean>;
  updateSettings: (settings: Partial<Settings>) => void;
  setVisualMode: (mode: VisualMode) => void;
  addQuote: (quote: Omit<Quote, 'id'>) => void;
  removeQuote: (id: string) => void;
  completeOnboarding: () => void;
  
  // Task actions
  addTask: (name: string, durationHours: number, notes?: string) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  removeTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  
  // Session actions
  createSession: () => void;
  startSession: () => void;
  completeCurrentTask: (early?: boolean) => void;
  
  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  
  // Extension actions
  addExtension: (minutes: number) => void;
  
  // Pause actions
  emergencyPause: () => void;
  resumeFromPause: () => void;
  
  // Data actions
  exportData: () => string;
  importData: (json: string) => boolean;
  resetApp: () => void;
}

const initialState = loadState();

export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...initialState,

    // Settings actions
    setPassword: async (password: string) => {
      const hash = await hashPassword(password);
      set(state => {
        const newState = {
          ...state,
          settings: { ...state.settings, passwordHash: hash }
        };
        saveState(newState);
        return newState;
      });
    },

    verifyPassword: async (password: string) => {
      const { settings } = get();
      return verifyPassword(password, settings.passwordHash);
    },

    updateSettings: (updates: Partial<Settings>) => {
      set(state => {
        const newState = {
          ...state,
          settings: { ...state.settings, ...updates }
        };
        saveState(newState);
        return newState;
      });
    },

    setVisualMode: (mode: VisualMode) => {
      get().updateSettings({ visualMode: mode });
    },

    addQuote: (quote: Omit<Quote, 'id'>) => {
      set(state => {
        const newQuote: Quote = { ...quote, id: generateId() };
        const newState = {
          ...state,
          settings: {
            ...state.settings,
            quotes: [...state.settings.quotes, newQuote]
          }
        };
        saveState(newState);
        return newState;
      });
    },

    removeQuote: (id: string) => {
      set(state => {
        const newState = {
          ...state,
          settings: {
            ...state.settings,
            quotes: state.settings.quotes.filter(q => q.id !== id)
          }
        };
        saveState(newState);
        return newState;
      });
    },

    completeOnboarding: () => {
      get().updateSettings({ onboardingCompleted: true });
    },

    // Task actions
    addTask: (name: string, durationHours: number, notes?: string) => {
      set(state => {
        const task: Task = {
          id: generateId(),
          name,
          durationHours,
          notes,
          status: 'pending',
          extensions: []
        };
        
        const session = state.currentSession || {
          id: generateId(),
          date: getTodayDate(),
          tasks: [],
          state: 'idle',
          currentTaskIndex: 0,
          pauseEvents: [],
          totalPlannedMs: 0,
          totalActualMs: 0
        };

        const newSession: Session = {
          ...session,
          tasks: [...session.tasks, task],
          totalPlannedMs: session.totalPlannedMs + hoursToMs(durationHours)
        };

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    updateTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => {
      set(state => {
        if (!state.currentSession) return state;

        const oldTask = state.currentSession.tasks.find(t => t.id === id);
        if (!oldTask) return state;

        const durationDiff = updates.durationHours !== undefined
          ? hoursToMs(updates.durationHours) - hoursToMs(oldTask.durationHours)
          : 0;

        const newTasks = state.currentSession.tasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        );

        const newSession: Session = {
          ...state.currentSession,
          tasks: newTasks,
          totalPlannedMs: state.currentSession.totalPlannedMs + durationDiff
        };

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    removeTask: (id: string) => {
      set(state => {
        if (!state.currentSession) return state;

        const task = state.currentSession.tasks.find(t => t.id === id);
        if (!task) return state;

        const newTasks = state.currentSession.tasks.filter(t => t.id !== id);
        const newSession: Session = {
          ...state.currentSession,
          tasks: newTasks,
          totalPlannedMs: state.currentSession.totalPlannedMs - hoursToMs(task.durationHours)
        };

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    reorderTasks: (fromIndex: number, toIndex: number) => {
      set(state => {
        if (!state.currentSession) return state;
        
        // Can't reorder the current active task
        const currentIdx = state.currentSession.currentTaskIndex;
        if (state.currentSession.state === 'running') {
          if (fromIndex === currentIdx || toIndex <= currentIdx) return state;
        }

        const tasks = [...state.currentSession.tasks];
        const [removed] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, removed);

        const newSession: Session = {
          ...state.currentSession,
          tasks
        };

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    // Session actions
    createSession: () => {
      set(state => {
        const session: Session = {
          id: generateId(),
          date: getTodayDate(),
          tasks: [],
          state: 'idle',
          currentTaskIndex: 0,
          pauseEvents: [],
          totalPlannedMs: 0,
          totalActualMs: 0
        };
        const newState = { ...state, currentSession: session };
        saveState(newState);
        return newState;
      });
    },

    startSession: () => {
      set(state => {
        if (!state.currentSession || state.currentSession.tasks.length === 0) {
          return state;
        }

        const now = Date.now();
        const tasks = state.currentSession.tasks.map((t, idx) => ({
          ...t,
          status: idx === 0 ? 'active' as const : 'pending' as const,
          startedAt: idx === 0 ? now : undefined
        }));

        const newSession: Session = {
          ...state.currentSession,
          tasks,
          state: 'running',
          startedAt: now,
          currentTaskIndex: 0
        };

        const newState = {
          ...state,
          currentSession: newSession,
          timerActive: true,
          elapsedMs: 0,
          lastTickTime: now
        };
        saveState(newState);
        return newState;
      });
    },

    completeCurrentTask: (early: boolean = false) => {
      set(state => {
        if (!state.currentSession || state.currentSession.state !== 'running') {
          return state;
        }

        const now = Date.now();
        const currentIdx = state.currentSession.currentTaskIndex;
        const currentTask = state.currentSession.tasks[currentIdx];
        
        if (!currentTask || currentTask.status !== 'active') return state;

        const timeSpentMs = state.elapsedMs;
        const updatedTask: Task = {
          ...currentTask,
          status: 'completed',
          completedAt: now,
          timeSpentMs,
          completedEarly: early
        };

        const tasks = [...state.currentSession.tasks];
        tasks[currentIdx] = updatedTask;

        // Check if there are more tasks
        const nextIdx = currentIdx + 1;
        const hasMoreTasks = nextIdx < tasks.length;

        if (hasMoreTasks) {
          // Activate next task
          tasks[nextIdx] = {
            ...tasks[nextIdx],
            status: 'active',
            startedAt: now
          };

          const newSession: Session = {
            ...state.currentSession,
            tasks,
            currentTaskIndex: nextIdx,
            totalActualMs: state.currentSession.totalActualMs + timeSpentMs
          };

          const newState = {
            ...state,
            currentSession: newSession,
            elapsedMs: 0,
            lastTickTime: now
          };
          saveState(newState);
          return newState;
        } else {
          // Session complete
          const newSession: Session = {
            ...state.currentSession,
            tasks,
            state: 'completed',
            completedAt: now,
            totalActualMs: state.currentSession.totalActualMs + timeSpentMs
          };

          const newHistory = updateDailySummary(state.history, newSession);

          const newState = {
            ...state,
            currentSession: null,
            history: newHistory,
            timerActive: false,
            elapsedMs: 0,
            lastTickTime: null
          };
          saveState(newState);
          return newState;
        }
      });
    },

    // Timer actions
    startTimer: () => {
      set(state => {
        const newState = {
          ...state,
          timerActive: true,
          lastTickTime: Date.now()
        };
        saveState(newState);
        return newState;
      });
    },

    pauseTimer: () => {
      set(state => {
        const newState = {
          ...state,
          timerActive: false,
          lastTickTime: null
        };
        saveState(newState);
        return newState;
      });
    },

    resumeTimer: () => {
      set(state => {
        const newState = {
          ...state,
          timerActive: true,
          lastTickTime: Date.now()
        };
        saveState(newState);
        return newState;
      });
    },

    tick: () => {
      set(state => {
        if (!state.timerActive || !state.lastTickTime) return state;
        if (!state.currentSession || state.currentSession.state !== 'running') return state;

        const now = Date.now();
        const delta = now - state.lastTickTime;
        const newElapsed = state.elapsedMs + delta;

        // Check if current task time is up
        const currentTask = state.currentSession.tasks[state.currentSession.currentTaskIndex];
        if (!currentTask) return state;

        const totalTaskMs = hoursToMs(currentTask.durationHours) +
          currentTask.extensions.reduce((sum, ext) => sum + minutesToMs(ext.minutes), 0);

        if (newElapsed >= totalTaskMs) {
          // Auto-complete task
          get().completeCurrentTask(false);
          return get(); // Return fresh state after completion
        }

        const newState = {
          ...state,
          elapsedMs: newElapsed,
          lastTickTime: now
        };

        // Save state only when elapsed seconds change (throttle saves)
        const currentSeconds = Math.floor(state.elapsedMs / 1000);
        const newSeconds = Math.floor(newElapsed / 1000);
        if (currentSeconds !== newSeconds) {
          saveState(newState);
        }

        return newState;
      });
    },

    // Extension actions
    addExtension: (minutes: number) => {
      set(state => {
        if (!state.currentSession || state.currentSession.state !== 'running') {
          return state;
        }

        const currentIdx = state.currentSession.currentTaskIndex;
        const extension: Extension = {
          id: generateId(),
          minutes,
          appliedAt: Date.now()
        };

        const tasks = state.currentSession.tasks.map((t, idx) =>
          idx === currentIdx
            ? { ...t, extensions: [...t.extensions, extension] }
            : t
        );

        // Also update total planned time
        const newSession: Session = {
          ...state.currentSession,
          tasks,
          totalPlannedMs: state.currentSession.totalPlannedMs + minutesToMs(minutes)
        };

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    // Pause actions
    emergencyPause: () => {
      set(state => {
        if (!state.currentSession || state.currentSession.state !== 'running') {
          return state;
        }

        const pauseEvent: PauseEvent = {
          id: generateId(),
          pausedAt: Date.now()
        };

        const newSession: Session = {
          ...state.currentSession,
          state: 'paused',
          pauseEvents: [...state.currentSession.pauseEvents, pauseEvent]
        };

        const newState = {
          ...state,
          currentSession: newSession,
          timerActive: false,
          lastTickTime: null
        };
        saveState(newState);
        return newState;
      });
    },

    resumeFromPause: () => {
      set(state => {
        if (!state.currentSession || state.currentSession.state !== 'paused') {
          return state;
        }

        const pauseEvents = [...state.currentSession.pauseEvents];
        if (pauseEvents.length > 0) {
          const lastPause = pauseEvents[pauseEvents.length - 1];
          pauseEvents[pauseEvents.length - 1] = {
            ...lastPause,
            resumedAt: Date.now()
          };
        }

        const newSession: Session = {
          ...state.currentSession,
          state: 'running',
          pauseEvents
        };

        const newState = {
          ...state,
          currentSession: newSession,
          timerActive: true,
          lastTickTime: Date.now()
        };
        saveState(newState);
        return newState;
      });
    },

    // Data actions
    exportData: () => {
      const state = get();
      return JSON.stringify({
        settings: state.settings,
        currentSession: state.currentSession,
        history: state.history,
        timerActive: state.timerActive,
        elapsedMs: state.elapsedMs,
        lastTickTime: state.lastTickTime
      }, null, 2);
    },

    importData: (json: string) => {
      try {
        const data = JSON.parse(json);
        if (data.settings && typeof data.settings === 'object') {
          set(state => {
            const newState = {
              ...state,
              settings: { ...getDefaultSettings(), ...data.settings },
              currentSession: data.currentSession || null,
              history: data.history || [],
              timerActive: data.timerActive || false,
              elapsedMs: data.elapsedMs || 0,
              lastTickTime: data.lastTickTime || null
            };
            saveState(newState);
            return newState;
          });
          return true;
        }
      } catch (error) {
        console.error('Failed to import data:', error);
      }
      return false;
    },

    resetApp: () => {
      localStorage.removeItem('lockstep_data');
      set({
        settings: getDefaultSettings(),
        currentSession: null,
        history: [],
        timerActive: false,
        elapsedMs: 0,
        lastTickTime: null
      });
    }
  }))
);

// Export selector hooks for common selections
export const useSettings = () => useStore(state => state.settings);
export const useCurrentSession = () => useStore(state => state.currentSession);
export const useHistory = () => useStore(state => state.history);
export const useTimerState = () => useStore(state => ({
  timerActive: state.timerActive,
  elapsedMs: state.elapsedMs
}));
