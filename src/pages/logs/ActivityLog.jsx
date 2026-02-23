import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToLogs } from '../../firebase/logs';
import { LogEntry } from '../../components/LogEntry';
import { AddLogModal } from '../../components/AddLogModal';
import { Button } from '../../components/ui/Button';

const FILTERS = [
  { id: 'all',         label: 'All' },
  { id: 'medication',  label: '💊 Medication' },
  { id: 'appointment', label: '📅 Appointment' },
  { id: 'mood',        label: '😊 Mood' },
  { id: 'note',        label: '📝 Note' },
  { id: 'incident',    label: '⚠️ Incident' },
];

export function ActivityLog() {
  const { currentCircle } = useAuth();
  const circleId = currentCircle?.id;

  const [logs, setLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!circleId) return;
    const unsub = subscribeToLogs(circleId, setLogs, 300);
    return unsub;
  }, [circleId]);

  const filtered = filter === 'all' ? logs : logs.filter((l) => l.type === filter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Activity Log</h1>
        <Button onClick={() => setShowModal(true)}>+ Add Entry</Button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={[
              'px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filter === f.id
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400',
            ].join(' ')}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Log list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          {filter === 'all'
            ? <p className="font-medium">No activity yet — add the first entry</p>
            : <p className="font-medium">No {filter} entries yet</p>
          }
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((log) => (
            <LogEntry key={log.id} log={log} circleId={circleId} />
          ))}
        </div>
      )}

      {showModal && (
        <AddLogModal circleId={circleId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
