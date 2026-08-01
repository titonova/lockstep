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
import { 
  calculateScheduledTimes, 
  getTaskStatusFromSchedule,
  getElapsedForTask
} from '../utils/scheduling';
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
  addTaskForDate: (date: string, name: string, durationHours: number, notes?: string) => void;
  updateTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  updateTaskForDate: (date: string, id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  removeTask: (id: string) => void;
  removeTaskForDate: (date: string, id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  reorderTasksForDate: (date: string, fromIndex: number, toIndex: number) => void;
  setPlanAutoStart: (date: string, autoStart: boolean) => void;
  
  // Pinned task actions
  addPinnedTask: (name: string, durationHours: number, notes?: string) => void;
  updatePinnedTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  removePinnedTask: (id: string) => void;
  addPinnedTasksToSession: (taskIds: string[]) => void;
  addPinnedTasksToDate: (date: string, taskIds: string[]) => void;
  
  // Session actions
  createSession: () => void;
  reconcilePlans: () => void;
  startSession: () => void;
  completeCurrentTask: (early?: boolean) => void;
  restartSession: (action: 'restart' | 'stop', clearTasks: boolean) => void;
  
  // Timer actions
  startTimer: () => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  forceRestartTimer: () => void;
  
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

function createEmptySession(date: string): Session {
  return {
    id: generateId(),
    date,
    tasks: [],
    state: 'idle',
    currentTaskIndex: 0,
    pauseEvents: [],
    totalPlannedMs: 0,
    totalActualMs: 0
  };
}

export const useStore = create<StoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    ...initialState,

    reconcilePlans: () => {
      set(state => {
        const today = getTodayDate();
        let currentSession = state.currentSession;
        let plannedSessions = [...state.plannedSessions];
        let timerActive = state.timerActive;
        let elapsedMs = state.elapsedMs;
        let lastTickTime = state.lastTickTime;

        // A prepared, non-running session from a previous date is retained as a plan.
        if (currentSession && currentSession.date !== today && currentSession.state === 'idle' && currentSession.tasks.length > 0) {
          if (!plannedSessions.some(plan => plan.date === currentSession!.date)) {
            plannedSessions.push(currentSession);
          }
          currentSession = null;
        }

        const duePlan = plannedSessions.find(plan => plan.date === today);
        const currentHasWork = currentSession && (currentSession.tasks.length > 0 || currentSession.state !== 'idle');
        if (duePlan && !currentHasWork) {
          currentSession = duePlan;
          plannedSessions = plannedSessions.filter(plan => plan.id !== duePlan.id);
          if (duePlan.autoStart && duePlan.tasks.length > 0) {
            const now = Date.now();
            currentSession = {
              ...duePlan,
              state: 'running',
              startedAt: now,
              currentTaskIndex: 0,
              tasks: duePlan.tasks.map((task, index) => ({
                ...task,
                status: index === 0 ? 'active' as const : 'pending' as const,
                startedAt: index === 0 ? now : undefined
              }))
            };
            currentSession = calculateScheduledTimes(currentSession, now, 0);
            timerActive = true;
            elapsedMs = 0;
            lastTickTime = now;
          }
        }

        const newState = { ...state, currentSession, plannedSessions, timerActive, elapsedMs, lastTickTime };
        if (currentSession !== state.currentSession || plannedSessions.length !== state.plannedSessions.length || timerActive !== state.timerActive) {
          saveState(newState);
        }
        return newState;
      });
    },

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

        let newSession: Session = {
          ...session,
          tasks: [...session.tasks, task],
          totalPlannedMs: session.totalPlannedMs + hoursToMs(durationHours)
        };

        // If session is running, calculate scheduled times for the new task
        if (newSession.state === 'running') {
          // Re-calculate starting from current task to ensure all subsequent 
          // tasks (including the new one) are correctly scheduled
          const now = Date.now();
          const currentTask = newSession.tasks[newSession.currentTaskIndex];
          const startTime = currentTask.scheduledStartAt || (now - state.elapsedMs);
          newSession = calculateScheduledTimes(newSession, startTime, newSession.currentTaskIndex);
        }

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    addTaskForDate: (date: string, name: string, durationHours: number, notes?: string) => {
      if (date === getTodayDate()) {
        get().addTask(name, durationHours, notes);
        return;
      }
      set(state => {
        const task: Task = { id: generateId(), name, durationHours, notes, status: 'pending', extensions: [] };
        const existing = state.plannedSessions.find(plan => plan.date === date);
        const session = existing || createEmptySession(date);
        const newSession = {
          ...session,
          tasks: [...session.tasks, task],
          totalPlannedMs: session.totalPlannedMs + hoursToMs(durationHours)
        };
        const plannedSessions = existing
          ? state.plannedSessions.map(plan => plan.id === session.id ? newSession : plan)
          : [...state.plannedSessions, newSession];
        const newState = { ...state, plannedSessions };
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

    updateTaskForDate: (date: string, id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => {
      if (date === getTodayDate()) { get().updateTask(id, updates); return; }
      set(state => {
        const plan = state.plannedSessions.find(item => item.date === date);
        const oldTask = plan?.tasks.find(task => task.id === id);
        if (!plan || !oldTask) return state;
        const durationDiff = updates.durationHours === undefined ? 0 : hoursToMs(updates.durationHours) - hoursToMs(oldTask.durationHours);
        const newPlan = { ...plan, tasks: plan.tasks.map(task => task.id === id ? { ...task, ...updates } : task), totalPlannedMs: plan.totalPlannedMs + durationDiff };
        const newState = { ...state, plannedSessions: state.plannedSessions.map(item => item.id === plan.id ? newPlan : item) };
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

    removeTaskForDate: (date: string, id: string) => {
      if (date === getTodayDate()) { get().removeTask(id); return; }
      set(state => {
        const plan = state.plannedSessions.find(item => item.date === date);
        const task = plan?.tasks.find(item => item.id === id);
        if (!plan || !task) return state;
        const newPlan = { ...plan, tasks: plan.tasks.filter(item => item.id !== id), totalPlannedMs: plan.totalPlannedMs - hoursToMs(task.durationHours) };
        const plannedSessions = newPlan.tasks.length === 0 ? state.plannedSessions.filter(item => item.id !== plan.id) : state.plannedSessions.map(item => item.id === plan.id ? newPlan : item);
        const newState = { ...state, plannedSessions };
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

    reorderTasksForDate: (date: string, fromIndex: number, toIndex: number) => {
      if (date === getTodayDate()) { get().reorderTasks(fromIndex, toIndex); return; }
      set(state => {
        const plan = state.plannedSessions.find(item => item.date === date);
        if (!plan || fromIndex < 0 || toIndex < 0 || fromIndex >= plan.tasks.length || toIndex >= plan.tasks.length) return state;
        const tasks = [...plan.tasks];
        const [removed] = tasks.splice(fromIndex, 1);
        tasks.splice(toIndex, 0, removed);
        const newPlan = { ...plan, tasks };
        const newState = { ...state, plannedSessions: state.plannedSessions.map(item => item.id === plan.id ? newPlan : item) };
        saveState(newState);
        return newState;
      });
    },

    setPlanAutoStart: (date: string, autoStart: boolean) => {
      set(state => {
        const plan = state.plannedSessions.find(item => item.date === date);
        if (!plan) return state;
        const newState = { ...state, plannedSessions: state.plannedSessions.map(item => item.id === plan.id ? { ...item, autoStart } : item) };
        saveState(newState);
        return newState;
      });
    },

    // Pinned task actions
    addPinnedTask: (name: string, durationHours: number, notes?: string) => {
      set(state => {
        const task: Task = {
          id: generateId(),
          name,
          durationHours,
          notes,
          status: 'pending',
          extensions: []
        };
        
        const newState = {
          ...state,
          pinnedTasks: [...state.pinnedTasks, task]
        };
        saveState(newState);
        return newState;
      });
    },

    updatePinnedTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => {
      set(state => {
        const newPinnedTasks = state.pinnedTasks.map(t =>
          t.id === id ? { ...t, ...updates } : t
        );
        
        const newState = { ...state, pinnedTasks: newPinnedTasks };
        saveState(newState);
        return newState;
      });
    },

    removePinnedTask: (id: string) => {
      set(state => {
        const newPinnedTasks = state.pinnedTasks.filter(t => t.id !== id);
        
        const newState = { ...state, pinnedTasks: newPinnedTasks };
        saveState(newState);
        return newState;
      });
    },

    addPinnedTasksToSession: (taskIds: string[]) => {
      set(state => {
        const tasksToAdd = state.pinnedTasks
          .filter(t => taskIds.includes(t.id))
          .map(t => ({
            ...t,
            id: generateId(), // Generate new IDs for session tasks
            status: 'pending' as const,
            extensions: []
          }));

        if (tasksToAdd.length === 0) return state;

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

        let newSession: Session = {
          ...session,
          tasks: [...session.tasks, ...tasksToAdd],
          totalPlannedMs: session.totalPlannedMs + tasksToAdd.reduce((sum, t) => sum + hoursToMs(t.durationHours), 0)
        };

        // If session is running, calculate scheduled times for the new tasks
        if (newSession.state === 'running') {
          const now = Date.now();
          const currentTask = newSession.tasks[newSession.currentTaskIndex];
          const startTime = currentTask.scheduledStartAt || (now - state.elapsedMs);
          newSession = calculateScheduledTimes(newSession, startTime, newSession.currentTaskIndex);
        }

        const newState = { ...state, currentSession: newSession };
        saveState(newState);
        return newState;
      });
    },

    addPinnedTasksToDate: (date: string, taskIds: string[]) => {
      if (date === getTodayDate()) { get().addPinnedTasksToSession(taskIds); return; }
      set(state => {
        const tasksToAdd = state.pinnedTasks.filter(task => taskIds.includes(task.id)).map(task => ({ ...task, id: generateId(), status: 'pending' as const, extensions: [] }));
        if (tasksToAdd.length === 0) return state;
        const existing = state.plannedSessions.find(plan => plan.date === date);
        const session = existing || createEmptySession(date);
        const newSession = { ...session, tasks: [...session.tasks, ...tasksToAdd], totalPlannedMs: session.totalPlannedMs + tasksToAdd.reduce((sum, task) => sum + hoursToMs(task.durationHours), 0) };
        const plannedSessions = existing ? state.plannedSessions.map(plan => plan.id === session.id ? newSession : plan) : [...state.plannedSessions, newSession];
        const newState = { ...state, plannedSessions };
        saveState(newState);
        return newState;
      });
    },

    // Session actions
    createSession: () => {
      set(state => {
        const session = createEmptySession(getTodayDate());
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

        let newSession: Session = {
          ...state.currentSession,
          tasks,
          state: 'running',
          startedAt: now,
          currentTaskIndex: 0
        };

        // Calculate scheduled times for all tasks
        newSession = calculateScheduledTimes(newSession, now, 0);

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

          let newSession: Session = {
            ...state.currentSession,
            tasks,
            currentTaskIndex: nextIdx,
            totalActualMs: state.currentSession.totalActualMs + timeSpentMs
          };

          // Recalculate scheduled times from current task onward to prevent "frozen" timer
          // Checks against absolute timestamps instead of relative
          newSession = calculateScheduledTimes(newSession, now, nextIdx);

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

    restartSession: (action: 'restart' | 'stop', clearTasks: boolean) => {
      set(state => {
        if (!state.currentSession) return state;

        const now = Date.now();
        const shouldStart = action === 'restart';
        let tasks: Task[] = [];
        
        if (!clearTasks) {
          tasks = state.currentSession.tasks.map((t, idx) => ({
            ...t,
            status: (shouldStart && idx === 0) ? 'active' : 'pending',
            startedAt: (shouldStart && idx === 0) ? now : undefined,
            completedAt: undefined,
            timeSpentMs: undefined,
            completedEarly: undefined,
            extensions: [],
            // Reset scheduled times too, they will be recalculated if starting
            scheduledStartAt: undefined,
            scheduledCompleteAt: undefined
          }));
        }

        let newSession: Session = {
          ...state.currentSession,
          tasks,
          state: (shouldStart && tasks.length > 0) ? 'running' : 'idle',
          startedAt: (shouldStart && tasks.length > 0) ? now : undefined,
          currentTaskIndex: 0,
          pauseEvents: [],
          totalActualMs: 0,
          totalPlannedMs: tasks.reduce((sum, t) => sum + hoursToMs(t.durationHours), 0)
        };

        if (shouldStart && tasks.length > 0) {
          newSession = calculateScheduledTimes(newSession, now, 0);
        }

        const newState = {
          ...state,
          currentSession: newSession,
          timerActive: (shouldStart && tasks.length > 0),
          elapsedMs: 0,
          lastTickTime: (shouldStart && tasks.length > 0) ? now : null
        };
        saveState(newState);
        return newState;
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

    forceRestartTimer: () => {
      set(state => {
        if (!state.currentSession || state.currentSession.state !== 'running') {
          return state;
        }

        const now = Date.now();
        const currentIdx = state.currentSession.currentTaskIndex;
        const tasks = [...state.currentSession.tasks];
        const currentTask = tasks[currentIdx];

        if (!currentTask || currentTask.status !== 'active') return state;

        // Force reset the scheduled times starting from NOW
        tasks[currentIdx] = {
          ...currentTask,
          startedAt: now,
          scheduledStartAt: now
        };

        let newSession: Session = {
          ...state.currentSession,
          tasks
        };

        // Recalculate all scheduled times from current task onward
        newSession = calculateScheduledTimes(newSession, now, currentIdx);

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

    tick: () => {
      set(state => {
        if (!state.timerActive || !state.lastTickTime) return state;
        if (!state.currentSession || state.currentSession.state !== 'running') return state;

        const now = Date.now();
        let session = { ...state.currentSession };

        // Check which tasks should be complete based on scheduled times
        const { completedIndices, activeIndex } = getTaskStatusFromSchedule(session, now);

        // Auto-complete overdue tasks
        if (completedIndices.length > 0) {
          const tasks = [...session.tasks];
          completedIndices.forEach(idx => {
            const task = tasks[idx];
            if (task.status !== 'completed') {
              const taskDuration = hoursToMs(task.durationHours) + 
                task.extensions.reduce((sum, ext) => sum + minutesToMs(ext.minutes), 0);
              
              tasks[idx] = {
                ...task,
                status: 'completed',
                completedAt: task.scheduledCompleteAt || now,
                timeSpentMs: taskDuration,
                completedEarly: false
              };
            }
          });

          // Update to next active task or complete session
          if (activeIndex >= tasks.length) {
            // Session complete
            session = {
              ...session,
              tasks,
              state: 'completed',
              completedAt: now,
              totalActualMs: session.totalActualMs + tasks
                .filter(t => t.status === 'completed' && t.timeSpentMs)
                .reduce((sum, t) => sum + (t.timeSpentMs || 0), 0)
            };

            const newHistory = updateDailySummary(state.history, session);
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
          } else {
            // Move to next task
            const nextTaskStart = tasks[activeIndex].scheduledStartAt || now;
            tasks[activeIndex] = {
              ...tasks[activeIndex],
              status: 'active',
              startedAt: nextTaskStart,
              scheduledStartAt: nextTaskStart // Ensure this is always set
            };

            session = {
              ...session,
              tasks,
              currentTaskIndex: activeIndex
            };

            // Recalculate scheduled times from this task onward
            session = calculateScheduledTimes(session, nextTaskStart, activeIndex);
          }
        }

        // Calculate elapsed time for current active task
        const currentTask = session.tasks[session.currentTaskIndex];
        if (!currentTask) return state;

        const elapsedMs = getElapsedForTask(currentTask, now);

        const newState = {
          ...state,
          currentSession: session,
          elapsedMs,
          lastTickTime: now
        };

        // Save state only when elapsed seconds change (throttle saves)
        const currentSeconds = Math.floor(state.elapsedMs / 1000);
        const newSeconds = Math.floor(elapsedMs / 1000);
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

        let newSession: Session = {
          ...state.currentSession,
          tasks,
          totalPlannedMs: state.currentSession.totalPlannedMs + minutesToMs(minutes)
        };

        // Recalculate scheduled times from current task onward
        // Use existing scheduled start time to preserve any previous drifts/early completions
        const currentTask = newSession.tasks[currentIdx];
        const startTime = currentTask.scheduledStartAt || (Date.now() - state.elapsedMs);
        newSession = calculateScheduledTimes(newSession, startTime, currentIdx);

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

        const now = Date.now();
        const pauseEvents = [...state.currentSession.pauseEvents];
        if (pauseEvents.length > 0) {
          const lastPause = pauseEvents[pauseEvents.length - 1];
          pauseEvents[pauseEvents.length - 1] = {
            ...lastPause,
            resumedAt: now
          };
        }

        let newSession: Session = {
          ...state.currentSession,
          state: 'running',
          pauseEvents
        };

        // Recalculate scheduled times accounting for pause duration
        // The key insight: we need to shift the start time forward by the pause duration
        // to account for the time lost during the pause
        const currentIdx = newSession.currentTaskIndex;
        const currentTask = newSession.tasks[currentIdx];
        const lastPause = newSession.pauseEvents[newSession.pauseEvents.length - 1];
        const pauseDuration = lastPause ? ((lastPause.resumedAt || now) - lastPause.pausedAt) : 0;
        
        // If we have a scheduled start time, shift it forward by pause duration
        // If not, use (now - elapsedMs) as the effective start time so timer continues from where it was
        let newStartAt: number;
        if (currentTask.scheduledStartAt) {
          newStartAt = currentTask.scheduledStartAt + pauseDuration;
        } else {
          // Fallback: calculate based on elapsed time before pause
          newStartAt = now - state.elapsedMs;
        }
        newSession = calculateScheduledTimes(newSession, newStartAt, currentIdx);

        const newState = {
          ...state,
          currentSession: newSession,
          timerActive: true,
          lastTickTime: now
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
        plannedSessions: state.plannedSessions,
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
              plannedSessions: data.plannedSessions || [],
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
        plannedSessions: [],
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
