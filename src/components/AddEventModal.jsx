import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { createEvent } from '../firebase/events';
import { Button } from './ui/Button';

const TYPE_OPTIONS = [
  { id: 'appointment', emoji: '📅', label: 'Appointment' },
  { id: 'task',        emoji: '✅', label: 'Task' },
  { id: 'medication',  emoji: '💊', label: 'Medication' },
  { id: 'other',       emoji: '📌', label: 'Other' },
];

export function AddEventModal({ circleId, onClose }) {
  const { firebaseUser, userDoc } = useAuth();

  // Guard: patients cannot create events
  if (userDoc?.role === 'patient') return null;

  const [type, setType] = useState('appointment');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [notes, setNotes] = useState('');
  const [checklistText, setChecklistText] = useState('');
  const [checklistItems, setChecklistItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function addChecklistItem() {
    if (!checklistText.trim()) return;
    setChecklistItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), text: checklistText.trim(), done: false, doneBy: null, doneAt: null },
    ]);
    setChecklistText('');
  }

  function removeChecklistItem(id) {
    setChecklistItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!title.trim()) { setError('Title is required.'); return; }
    if (!date) { setError('Date is required.'); return; }

    const allDay = !time;
    let eventDate;
    if (allDay) {
      eventDate = new Date(date + 'T00:00:00');
    } else {
      eventDate = new Date(date + 'T' + time);
    }

    setLoading(true);
    try {
      await createEvent(circleId, firebaseUser.uid, userDoc.displayName, {
        title: title.trim(),
        type,
        eventDate,
        allDay,
        notes: notes.trim() || '',
        checklist: checklistItems,
      });
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save event. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl p-6 pb-8 animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Type picker */}
        <div className="flex gap-2 flex-wrap mb-5">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setType(t.id)}
              className={[
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors',
                type === t.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400',
              ].join(' ')}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title *">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Doctor appointment"
              className={inputCls}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date *">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Time (optional)">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={inputCls}
              />
            </Field>
          </div>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Additional details…"
              className={inputCls}
            />
          </Field>

          {/* Checklist builder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Checklist (optional)
            </label>
            {checklistItems.map((item) => (
              <div key={item.id} className="flex items-center gap-2 mb-1.5">
                <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded-lg">
                  {item.text}
                </span>
                <button
                  type="button"
                  onClick={() => removeChecklistItem(item.id)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-1">
              <input
                type="text"
                value={checklistText}
                onChange={(e) => setChecklistText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem(); } }}
                placeholder="Add checklist item…"
                className={inputCls + ' flex-1'}
              />
              <Button type="button" size="sm" variant="secondary" onClick={addChecklistItem}>
                Add
              </Button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls = [
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700',
  'px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500',
  'focus:outline-none focus:ring-2 focus:ring-blue-500',
].join(' ');
