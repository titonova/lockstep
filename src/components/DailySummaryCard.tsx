import { DailySummary } from '../types';
import { formatDuration } from '../utils/time';
import { GlassCard } from './GlassCard';

interface DailySummaryCardProps {
  summary: DailySummary;
}

export function DailySummaryCard({ summary }: DailySummaryCardProps) {
  const completionRate = summary.tasksPlanned > 0 
    ? Math.round((summary.tasksCompleted / summary.tasksPlanned) * 100)
    : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <GlassCard className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">{formatDate(summary.date)}</h3>
        <span className="text-sm text-white/40">
          {summary.sessions.length} session{summary.sessions.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide">Tasks</p>
          <p className="text-xl font-semibold text-white">
            {summary.tasksCompleted} / {summary.tasksPlanned}
          </p>
          <p className="text-sm text-white/50">{completionRate}% complete</p>
        </div>

        <div>
          <p className="text-white/40 text-xs uppercase tracking-wide">Time</p>
          <p className="text-xl font-semibold text-white">
            {formatDuration(summary.actualTimeMs)}
          </p>
          <p className="text-sm text-white/50">
            of {formatDuration(summary.plannedTimeMs)} planned
          </p>
        </div>
      </div>

      {(summary.extensionsUsed > 0 || summary.pausesUsed > 0) && (
        <div className="flex gap-4 pt-2 border-t border-white/10 text-sm text-white/50">
          {summary.extensionsUsed > 0 && (
            <span>{summary.extensionsUsed} extension{summary.extensionsUsed !== 1 ? 's' : ''}</span>
          )}
          {summary.pausesUsed > 0 && (
            <span>{summary.pausesUsed} pause{summary.pausesUsed !== 1 ? 's' : ''}</span>
          )}
        </div>
      )}
    </GlassCard>
  );
}
