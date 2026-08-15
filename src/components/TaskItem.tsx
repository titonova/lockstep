import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Task } from '../types';
import { Input } from './Input';
import { Button } from './Button';
import { formatHours, formatEndTime } from '../utils/time';

interface TaskItemProps {
  task: Task;
  index: number;
  isEditable: boolean;
  isSessionActive?: boolean;
  expectedEndTime?: number | null;
  onUpdate: (id: string, updates: Partial<Pick<Task, 'name' | 'durationHours' | 'notes'>>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string) => void;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragEnd?: () => void;
  draggable?: boolean;
}

export function TaskItem({
  task,
  index,
  isEditable,
  isSessionActive = false,
  expectedEndTime,
  onUpdate,
  onRemove,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  draggable = false
}: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editName, setEditName] = useState(task.name);
  const [editDuration, setEditDuration] = useState(task.durationHours.toString());
  const [editNotes, setEditNotes] = useState(task.notes || '');

  const handleSave = () => {
    const duration = parseFloat(editDuration);
    if (editName.trim() && duration > 0) {
      onUpdate(task.id, {
        name: editName.trim(),
        durationHours: duration,
        notes: editNotes.trim() || undefined
      });
      setIsExpanded(false);
    }
  };

  const statusClasses = {
    pending: 'border-white/10 bg-white/5',
    active: 'border-green-500/50 bg-green-500/10',
    completed: 'border-white/5 bg-white/5 opacity-60',
    skipped: 'border-white/5 bg-white/5 opacity-40'
  };

  const statusIndicator = {
    pending: <span className="w-3 h-3 rounded-full bg-white/20" />,
    active: <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />,
    completed: <span className="text-green-400">✓</span>,
    skipped: <span className="text-white/40">—</span>
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all ${statusClasses[task.status]} 
        ${draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      draggable={draggable}
      onDragStart={() => onDragStart?.(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(index); }}
      onDragEnd={() => onDragEnd?.()}
    >
      {!isExpanded ? (
        <div className="flex items-center gap-4">
          {/* Drag handle */}
          {draggable && (
            <div className="text-white/30 hover:text-white/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
            </div>
          )}

          {/* Status indicator */}
          <div className="flex-shrink-0">
            {statusIndicator[task.status]}
          </div>

          {/* Task info */}
          <div className="flex-1 min-w-0">
            <h3 className={`font-medium truncate ${task.status === 'completed' ? 'line-through text-white/50' : 'text-white'}`}>
              {task.name}
            </h3>
            {task.notes && (
              <div className="text-sm text-white/40 mt-0.5 line-clamp-2 prose prose-sm prose-invert max-w-none
                [&_p]:m-0 [&_ul]:m-0 [&_ol]:m-0 [&_li]:m-0 [&_code]:text-xs [&_strong]:text-white/60">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{task.notes}</ReactMarkdown>
              </div>
            )}
          </div>

          {/* Duration with custom end-time tooltip */}
          <div className="relative group flex-shrink-0 text-right">
            <div className="text-white/60 text-sm cursor-default">
              {formatHours(task.durationHours)}
            </div>
            {expectedEndTime != null && (
              <div className="absolute right-0 bottom-full mb-1.5 px-2.5 py-1.5
                text-xs bg-[#0d1520]/95 border border-white/15 rounded-lg text-white/80
                whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity
                pointer-events-none z-20 shadow-xl">
                ends {formatEndTime(expectedEndTime)}
                <div className="absolute top-full right-3 w-0 h-0
                  border-l-4 border-r-4 border-t-4
                  border-l-transparent border-r-transparent border-t-[#0d1520]/95" />
              </div>
            )}
          </div>

          {/* Edit button */}
          {isEditable && task.status === 'pending' && (
            <button
              onClick={() => setIsExpanded(true)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}

          {isEditable && task.status === 'pending' && !isSessionActive && (
            <button
              onClick={() => onMove(task.id)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
              aria-label="Move task to another day"
              title="Move task to another day"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3m10-8l-4 4m0 0l4 4M9 12h12" />
              </svg>
            </button>
          )}

          {/* Remove button */}
          {isEditable && task.status === 'pending' && !isSessionActive && (
            <button
              onClick={() => onRemove(task.id)}
              className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-white/40 hover:text-red-400"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="Task name"
            autoFocus
          />
          <div className="flex gap-4">
            <div className="w-32">
              <Input
                type="number"
                step="0.25"
                min="0.25"
                value={editDuration}
                onChange={(e) => setEditDuration(e.target.value)}
                placeholder="Hours"
              />
              <p className="text-xs text-white/40 mt-1">Duration (hours)</p>
            </div>
            <div className="flex-1">
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Description — supports **markdown** (optional)"
                rows={4}
                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10
                  text-white placeholder-white/40 focus:outline-none focus:border-white/30
                  focus:bg-white/8 transition-all resize-y text-sm"
              />
              <p className="text-xs text-white/40 mt-1">Supports markdown</p>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
