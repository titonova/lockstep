import { useStore } from '../store';
import { DailySummaryCard } from '../components/DailySummaryCard';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';

interface HistoryPageProps {
  onBack: () => void;
}

export function HistoryPage({ onBack }: HistoryPageProps) {
  const history = useStore(state => state.history);
  const exportData = useStore(state => state.exportData);
  const importData = useStore(state => state.importData);

  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lockstep-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        const success = importData(text);
        if (success) {
          alert('Data imported successfully!');
        } else {
          alert('Failed to import data. Invalid format.');
        }
      }
    };
    input.click();
  };

  // Calculate totals
  const totalTasks = history.reduce((sum, d) => sum + d.tasksCompleted, 0);
  const totalHours = history.reduce((sum, d) => sum + d.actualTimeMs, 0) / (1000 * 60 * 60);

  return (
    <div className="min-h-screen p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-white">History</h1>
        </div>

        {/* Overall stats */}
        <GlassCard>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-3xl font-bold text-white">{history.length}</p>
              <p className="text-sm text-white/50">Days</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalTasks}</p>
              <p className="text-sm text-white/50">Tasks Done</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{totalHours.toFixed(1)}</p>
              <p className="text-sm text-white/50">Hours</p>
            </div>
          </div>
        </GlassCard>

        {/* Daily summaries */}
        {sortedHistory.length > 0 ? (
          <div className="space-y-4">
            {sortedHistory.map(summary => (
              <DailySummaryCard key={summary.date} summary={summary} />
            ))}
          </div>
        ) : (
          <GlassCard className="text-center py-12">
            <p className="text-white/50">No history yet</p>
            <p className="text-white/30 text-sm mt-2">Complete your first session to see stats here</p>
          </GlassCard>
        )}

        {/* Data management */}
        <GlassCard className="space-y-4">
          <h3 className="font-semibold text-white">Data Management</h3>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleExport} className="flex-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
            <Button variant="secondary" onClick={handleImport} className="flex-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
