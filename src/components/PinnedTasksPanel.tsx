import { useState } from 'react';
import { Task } from '../types';
import { GlassCard } from './GlassCard';
import { Button } from './Button';
import { Input } from './Input';
import { formatHours } from '../utils/time';

interface PinnedTasksPanelProps {
  pinnedTasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onAddPinnedTask: (name: string, durationHours: number, notes?: string) => void;
  onUpdatePinnedTask: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  onRemovePinnedTask: (id: string) => void;
  onAddToSession: (taskIds: string[]) => void;
}

export function PinnedTasksPanel({
  pinnedTasks,
  isOpen,
  onClose,
  onAddPinnedTask,
  onUpdatePinnedTask,
  onRemovePinnedTask,
  onAddToSession
}: PinnedTasksPanelProps) {
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const handleAddTask = () => {
    const duration = parseFloat(newTaskDuration);
    if (newTaskName.trim() && duration > 0) {
      onAddPinnedTask(newTaskName.trim(), duration, newTaskNotes.trim() || undefined);
      setNewTaskName('');
      setNewTaskDuration('');
      setNewTaskNotes('');
      setShowAddForm(false);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditName(task.name);
    setEditDuration(task.durationHours.toString());
    setEditNotes(task.notes || '');
  };

  const handleSaveEdit = () => {
    if (editingTaskId) {
      const duration = parseFloat(editDuration);
      if (editName.trim() && duration > 0) {
        onUpdatePinnedTask(editingTaskId, {
          name: editName.trim(),
          durationHours: duration,
          notes: editNotes.trim() || undefined
        });
        setEditingTaskId(null);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
  };

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskIds(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleAddSelectedToSession = () => {
    if (selectedTaskIds.length > 0) {
      onAddToSession(selectedTaskIds);
      setSelectedTaskIds([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative ml-auto w-full max-w-md h-full bg-[#080c14]/95 backdrop-blur-xl border-l border-white/10 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Pinned Tasks</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Add task button */}
          {!showAddForm && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Pinned Task
            </Button>
          )}

          {/* Add task form */}
          {showAddForm && (
            <GlassCard className="space-y-3">
              <Input
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                placeholder="Task name"
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
                <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddTask}
                  disabled={!newTaskName.trim() || !newTaskDuration || parseFloat(newTaskDuration) <= 0}
                >
                  Add
                </Button>
              </div>
            </GlassCard>
          )}

          {/* Task list */}
          <div className="space-y-2">
            {pinnedTasks.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                No pinned tasks yet. Add some tasks you do regularly.
              </div>
            ) : (
              pinnedTasks.map((task) => (
                <GlassCard key={task.id} className="p-4">
                  {editingTaskId === task.id ? (
                    <div className="space-y-3">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Task name"
                        autoFocus
                      />
                      <div className="flex gap-3">
                        <div className="w-28">
                          <Input
                            type="number"
                            step="0.25"
                            min="0.25"
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value)}
                            placeholder="Hours"
                          />
                        </div>
                        <div className="flex-1">
                          <Input
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            placeholder="Notes (optional)"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveEdit}
                          disabled={!editName.trim() || !editDuration || parseFloat(editDuration) <= 0}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTaskIds.includes(task.id)}
                        onChange={() => handleSelectTask(task.id)}
                        className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-white font-medium truncate">{task.name}</h3>
                          <span className="text-white/60 text-sm ml-2">
                            {formatHours(task.durationHours)}
                          </span>
                        </div>
                        {task.notes && (
                          <p className="text-white/60 text-sm mt-1">{task.notes}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onRemovePinnedTask(task.id)}
                          className="p-1 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-red-400"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))
            )}
          </div>

          {/* Add selected to session button */}
          {selectedTaskIds.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#080c14] to-transparent">
              <div className="max-w-md ml-auto">
                <Button
                  onClick={handleAddSelectedToSession}
                  className="w-full"
                  size="lg"
                >
                  Add {selectedTaskIds.length} Task{selectedTaskIds.length > 1 ? 's' : ''} to Session
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
