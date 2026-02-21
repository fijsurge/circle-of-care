import { deleteLog } from '../firebase/logs';
import { useAuth } from '../contexts/AuthContext';

const TYPE_META = {
  medication:  { icon: '💊', label: 'Medication',  accent: 'bg-blue-500' },
  appointment: { icon: '📅', label: 'Appointment', accent: 'bg-purple-500' },
  mood:        { icon: '😊', label: 'Mood',        accent: 'bg-yellow-400' },
  note:        { icon: '📝', label: 'Note',        accent: 'bg-green-500' },
  incident:    { icon: '⚠️', label: 'Incident',    accent: 'bg-red-500' },
};

const MOOD_EMOJIS = { 1: '😔', 2: '😟', 3: '😐', 4: '🙂', 5: '😊' };

function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

export function LogEntry({ log, circleId }) {
  const { firebaseUser, isAdmin } = useAuth();
  const meta = TYPE_META[log.type] || TYPE_META.note;
  const canDelete = isAdmin || log.authorId === firebaseUser?.uid;

  async function handleDelete() {
    if (!window.confirm('Delete this entry?')) return;
    try {
      await deleteLog(circleId, log.id);
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  }

  return (
    <div className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden shadow-sm">
      {/* Accent bar */}
      <div className={`w-1 shrink-0 ${meta.accent}`} />

      <div className="flex-1 py-3 pr-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type chip */}
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
              {meta.icon} {meta.label}
            </span>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
              {log.title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {timeAgo(log.createdAt)}
            </span>
            {canDelete && (
              <button
                onClick={handleDelete}
                title="Delete entry"
                className="text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors text-sm"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Author */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {log.authorName}
        </p>

        {/* Type-specific details */}
        <TypeDetails log={log} />

        {/* Notes */}
        {log.notes && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">
            {log.notes}
          </p>
        )}
      </div>
    </div>
  );
}

function TypeDetails({ log }) {
  if (log.type === 'medication') {
    return (
      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
        {log.medName && (
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {log.medName}
            {log.dose ? ` — ${log.dose}` : ''}
          </span>
        )}
        <span
          className={[
            'text-xs font-medium px-2 py-0.5 rounded-full',
            log.given
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          ].join(' ')}
        >
          {log.given ? 'Given ✓' : 'Not given ✗'}
        </span>
      </div>
    );
  }

  if (log.type === 'appointment') {
    return (
      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1.5 space-y-0.5">
        {log.provider && <p>Provider: {log.provider}</p>}
        {log.location && <p>Location: {log.location}</p>}
        {log.appointmentDate && (
          <p>Date: {new Date(log.appointmentDate).toLocaleString()}</p>
        )}
      </div>
    );
  }

  if (log.type === 'mood') {
    return (
      <p className="text-2xl mt-1.5">
        {MOOD_EMOJIS[log.rating] ?? '😐'}
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1 align-middle">
          {log.rating}/5
        </span>
      </p>
    );
  }

  return null;
}
