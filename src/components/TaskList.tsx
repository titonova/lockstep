import { useState } from 'react';
import { Task } from '../types';
import { TaskItem } from './TaskItem';
import { Input } from './Input';
import { Button } from './Button';
import { formatHours } from '../utils/time';

interface TaskListProps {
  tasks: Task[];
  currentTaskIndex: number;
  isSessionActive: boolean;
  onAddTask: (name: string, durationHours: number, notes?: string) => void;
  onUpdateTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  onRemoveTask: (id: string) => void;
  onReorderTasks: (fromIndex: number, toIndex: number) => void;
}

export function TaskList({
  tasks,
  currentTaskIndex,
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

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex items-center justify-between text-sm text-white/60">
        <span>{tasks.length} tasks</span>
        <span>
          {isSessionActive 
            ? `${formatHours(completedHours)} / ${formatHours(totalHours)}`
            : formatHours(totalHours)
          }
        </span>
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            isEditable={!isSessionActive || index > currentTaskIndex}
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
      {!isSessionActive && (
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
              Add Task
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
                  <Input
                    value={newTaskNotes}
                    onChange={(e) => setNewTaskNotes(e.target.value)}
                    placeholder="Notes (optional)"
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
      )}
    </div>
  );
}
