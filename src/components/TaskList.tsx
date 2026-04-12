import { useState } from 'react';
import { Task } from '../types';
import { TaskItem } from './TaskItem';
import { Input } from './Input';
import { Button } from './Button';
import { formatHours, hoursToMs, minutesToMs, formatEndTime } from '../utils/time';

interface TaskListProps {
  tasks: Task[];
  currentTaskIndex: number;
  isSessionActive: boolean;
  elapsedMs?: number;
  onAddTask: (name: string, durationHours: number, notes?: string) => void;
  onUpdateTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  onRemoveTask: (id: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
}

export function TaskList({
  tasks,
  currentTaskIndex,
  elapsedMs = 0,
  isSessionActive,
  onAddTask,
  onUpdateTask,
  onRemoveTask,
  onReorderTasks
}: TaskListProps) {
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);

  const handleAddTask = () => {
    const duration = parseFloat(newTaskDuration);
    if (newTaskName.trim() && duration > 0) {
      onAddTask(newTaskName.trim(), duration, newTaskNotes.trim() || undefined);
      setNewTaskName('');
      setNewTaskDuration('');
      setNewTaskNotes('');
      setIsAddingTask(false);
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    
    // Can't drag to positions at or before current task during session
    if (isSessionActive && index <= currentTaskIndex) return;
    if (isSessionActive && draggedIndex === currentTaskIndex) return;

    onReorderTasks(draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const totalHours = tasks.reduce((sum, t) => sum + t.durationHours, 0);
  const completedHours = tasks
    .filter(t => t.status === 'completed')
    .reduce((sum, t) => sum + t.durationHours, 0);
// Compute the expected end time for task at a given index (real-time, respects task order).
  // Returns null if the session isn't active or the task is already completed/skipped.
  const computeExpectedEndTime = (taskIndex: number): number | null => {
    if (!isSessionActive || taskIndex < currentTaskIndex) return null;
    const task = tasks[taskIndex];
    if (!task || task.status === 'completed' || task.status === 'skipped') return null;

    let offsetMs = 0;
    for (let i = currentTaskIndex; i <= taskIndex; i++) {
      const t = tasks[i];
      if (!t) continue;
      const total = hoursToMs(t.durationHours) + t.extensions.reduce((s, e) => s + minutesToMs(e.minutes), 0);
      if (i === currentTaskIndex) {
        offsetMs += Math.max(0, total - elapsedMs);
      } else {
        offsetMs += total;
      }
    }
    return Date.now() + offsetMs;
  };

  // Expected time when all remaining tasks are done
  const sessionEndTime: number | null = (() => {
    if (!isSessionActive || currentTaskIndex >= tasks.length) return null;
    let offsetMs = 0;
    for (let i = currentTaskIndex; i < tasks.length; i++) {
      const t = tasks[i];
      if (t.status === 'completed' || t.status === 'skipped') continue;
      const total = hoursToMs(t.durationHours) + t.extensions.reduce((s, e) => s + minutesToMs(e.minutes), 0);
      offsetMs += i === currentTaskIndex ? Math.max(0, total - elapsedMs) : total;
    }
    return Date.now() + offsetMs;
  })();

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>{tasks.length} tasks</span>
        <div className="flex items-center gap-2">
          <span>
            {isSessionActive
              ? `${formatHours(completedHours)} / ${formatHours(totalHours)}`
              : formatHours(totalHours)}
          </span>
          {sessionEndTime !== null && (
            <>
              <span className="text-white/20">·</span>
              <span>done by {formatEndTime(sessionEndTime)}</span>
            </>
          )}
        </div>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            isEditable={!isSessionActive || index > currentTaskIndex}
            isSessionActive={isSessionActive}
            expectedEndTime={computeExpectedEndTime(index)}
            onUpdate={onUpdateTask}
            onRemove={onRemoveTask}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            draggable={!isSessionActive || (index > currentTaskIndex)}
          />
        ))}
      </div>

      {/* Add task form */}
      <div className="pt-4 border-t border-white/10">
        {!isAddingTask ? (
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={() => setIsAddingTask(true)}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isSessionActive ? 'Add Task During Session' : 'Add Task'}
          </Button>
        ) : (
            <div className="space-y-3 p-4 rounded-xl bg-white/5 border border-white/10">
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="What needs to be done?"
                autoFocus
              />
              <div className="flex gap-3">
                <div className="w-28">
                  <Input
                    type="number"
                    step="0.25"
                    min="0.25"
                    value={newTaskDuration}
                    onChange={(e) => setNewTaskDuration(e.target.value)}
                    placeholder="Hours"
                  />
                </div>
                <div className="flex-1">
                  <textarea
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="Description — supports **markdown** (optional)"
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 
                      text-white placeholder-white/40 focus:outline-none focus:border-white/30 
                      focus:bg-white/8 transition-all resize-y text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAddingTask(false)}>
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim() || !newTaskDuration || parseFloat(newTaskDuration) <= 0}
                >
                  Add Task
                </Button>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
