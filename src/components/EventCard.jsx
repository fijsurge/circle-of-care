import { useState } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { claimEvent, unclaimEvent, updateChecklist, deleteEvent } from '../firebase/events';
import { Button } from './ui/Button';

const TYPE_CONFIG = {
  appointment: { color: 'border-purple-500', emoji: '📅', label: 'Appointment' },
  task:        { color: 'border-blue-500',   emoji: '✅', label: 'Task' },
  medication:  { color: 'border-green-500',  emoji: '💊', label: 'Medication' },
  other:       { color: 'border-gray-400',   emoji: '📌', label: 'Other' },
};

export function EventCard({ event, circleId, compact = false }) {
  const { firebaseUser, userDoc, isAdmin } = useAuth();
  const { isDetailed } = useTheme();
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [newItem, setNewItem] = useState('');
  const [working, setWorking] = useState(false);

  const isPatient = userDoc?.role === 'patient';
  const uid = firebaseUser?.uid;
  const config = TYPE_CONFIG[event.type] ?? TYPE_CONFIG.other;

  const isClaimed = !!event.claimedBy;
  const claimedBySelf = event.claimedBy === uid;
  const isCreator = event.createdBy === uid;

  // Format time string
  let timeStr = 'All day';
  if (!event.allDay && event.eventDate) {
    try {
      timeStr = format(event.eventDate.toDate(), 'h:mm a');
    } catch {
      timeStr = '';
    }
  }

  async function handleClaim() {
    setWorking(true);
    try {
      await claimEvent(circleId, event.id, uid, userDoc.displayName);
    } finally {
      setWorking(false);
    }
  }

  async function handleUnclaim() {
    setWorking(true);
    try {
      await unclaimEvent(circleId, event.id);
    } finally {
      setWorking(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this event?')) return;
    await deleteEvent(circleId, event.id);
  }

  async function handleChecklistToggle(index) {
    const updated = event.checklist.map((item, i) =>
      i === index
        ? {
            ...item,
            done: !item.done,
            doneBy: !item.done ? uid : null,
            doneAt: !item.done ? new Date() : null,
          }
        : item,
    );
    await updateChecklist(circleId, event.id, updated);
  }

  async function handleAddItem(e) {
    e.preventDefault();
    if (!newItem.trim()) return;
    const updated = [
      ...(event.checklist ?? []),
      { id: crypto.randomUUID(), text: newItem.trim(), done: false, doneBy: null, doneAt: null },
    ];
    setNewItem('');
    await updateChecklist(circleId, event.id, updated);
  }

  const checklist = event.checklist ?? [];
  const hasChecklist = checklist.length > 0;

  return (
    <div
      className={[
        'bg-white dark:bg-gray-800 rounded-xl border-l-4 ring-1 ring-inset ring-gray-200 dark:ring-gray-700 shadow-sm p-4',
        config.color,
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start gap-2">
        <span className="text-lg leading-none mt-0.5">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{timeStr}</p>
          {event.location && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">📍 {event.location}</p>
          )}
        </div>
      </div>

      {/* Notes */}
      {event.notes && (
        <p
          className={[
            'mt-2 text-sm text-gray-600 dark:text-gray-400',
            isDetailed ? '' : 'line-clamp-2',
          ].join(' ')}
        >
          {event.notes}
        </p>
      )}

      {/* Claim section */}
      {!compact && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {!isClaimed && !isPatient && (
            <Button size="sm" onClick={handleClaim} loading={working}>
              Claim
            </Button>
          )}
          {isClaimed && claimedBySelf && (
            <>
              <span className="text-xs font-medium text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                ✓ You're handling this
              </span>
              <Button size="sm" variant="ghost" onClick={handleUnclaim} loading={working}>
                Unclaim
              </Button>
            </>
          )}
          {isClaimed && !claimedBySelf && (
            <>
              <span className="text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                Claimed by {event.claimedByName}
              </span>
              {isAdmin && (
                <Button size="sm" variant="ghost" onClick={handleUnclaim} loading={working}>
                  Unclaim
                </Button>
              )}
            </>
          )}
        </div>
      )}

      {/* Checklist */}
      {!compact && (hasChecklist || !isPatient) && (
        <div className="mt-3 border-t border-gray-100 dark:border-gray-700 pt-3">
          {hasChecklist && (
            <button
              onClick={() => setChecklistOpen((o) => !o)}
              className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-2"
            >
              <span className={`transition-transform ${checklistOpen ? 'rotate-90' : ''}`}>›</span>
              Checklist ({checklist.filter((i) => i.done).length}/{checklist.length})
            </button>
          )}

          {(checklistOpen || (!hasChecklist && !isPatient)) && (
            <div className="space-y-1.5">
              {checklist.map((item, idx) => (
                <label key={item.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => handleChecklistToggle(idx)}
                    className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span
                    className={[
                      'text-sm',
                      item.done
                        ? 'line-through text-gray-400 dark:text-gray-500'
                        : 'text-gray-700 dark:text-gray-300',
                    ].join(' ')}
                  >
                    {item.text}
                  </span>
                </label>
              ))}

              {!isPatient && (
                <form onSubmit={handleAddItem} className="flex gap-1 mt-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder="Add item…"
                    className="flex-1 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="submit"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline px-1"
                  >
                    Add
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete button */}
      {!compact && (isAdmin || isCreator) && (
        <div className="mt-3 flex justify-end">
          <button
            onClick={handleDelete}
            className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:underline"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
