import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addLog } from '../firebase/logs';
import { Button } from './ui/Button';

const ALL_TYPES = [
  { id: 'medication',  icon: '💊', label: 'Medication' },
  { id: 'appointment', icon: '📅', label: 'Appointment' },
  { id: 'mood',        icon: '😊', label: 'Mood' },
  { id: 'note',        icon: '📝', label: 'Note' },
  { id: 'incident',    icon: '⚠️', label: 'Incident' },
];

const FAMILY_TYPES = ['mood', 'note'];
const PATIENT_TYPES = ['mood', 'note'];
const MOOD_OPTIONS = [
  { rating: 1, emoji: '😔' },
  { rating: 2, emoji: '😟' },
  { rating: 3, emoji: '😐' },
  { rating: 4, emoji: '🙂' },
  { rating: 5, emoji: '😊' },
];

function initialFields() {
  return {
    title: '',
    notes: '',
    // medication
    medName: '',
    dose: '',
    given: true,
    // appointment
    provider: '',
    location: '',
    appointmentDate: '',
    // mood
    rating: 3,
  };
}

export function AddLogModal({ circleId, onClose }) {
  const { firebaseUser, userDoc } = useAuth();
  const isFamily = userDoc?.role === 'family';
  const isPatient = userDoc?.role === 'patient';
  const availableTypes = ALL_TYPES.filter(
    (t) => (!isFamily && !isPatient) || PATIENT_TYPES.includes(t.id),
  );

  const [type, setType] = useState(availableTypes[0]?.id ?? 'note');
  const [fields, setFields] = useState(initialFields());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Build data payload
    const data = { type };
    if (type === 'medication') {
      if (!fields.medName.trim()) { setError('Medication name is required.'); return; }
      data.title = fields.medName.trim();
      data.medName = fields.medName.trim();
      data.dose = fields.dose.trim();
      data.given = fields.given;
      if (fields.notes.trim()) data.notes = fields.notes.trim();
    } else if (type === 'appointment') {
      if (!fields.provider.trim() && !fields.title.trim()) {
        setError('Provider or title is required.'); return;
      }
      data.title = fields.title.trim() || fields.provider.trim();
      data.provider = fields.provider.trim();
      data.location = fields.location.trim();
      data.appointmentDate = fields.appointmentDate;
      if (fields.notes.trim()) data.notes = fields.notes.trim();
    } else if (type === 'mood') {
      data.title = `Mood: ${fields.rating}/5`;
      data.rating = fields.rating;
      if (fields.notes.trim()) data.notes = fields.notes.trim();
    } else if (type === 'note') {
      if (!fields.notes.trim()) { setError('Notes cannot be empty.'); return; }
      data.title = fields.title.trim() || 'Note';
      data.notes = fields.notes.trim();
    } else if (type === 'incident') {
      if (!fields.title.trim()) { setError('Title is required.'); return; }
      data.title = fields.title.trim();
      if (fields.notes.trim()) data.notes = fields.notes.trim();
    }

    setLoading(true);
    try {
      await addLog(circleId, firebaseUser.uid, userDoc.displayName, data);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save entry. Please try again.');
      setLoading(false);
    }
  }

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Panel */}
      <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-t-2xl shadow-xl p-6 pb-8 animate-slide-up">
        {/* Handle */}
        <div className="w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Add Entry</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Type picker */}
        <div className="flex gap-2 flex-wrap mb-5">
          {availableTypes.map((t) => (
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
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Medication fields */}
          {type === 'medication' && (
            <>
              <Field label="Medication name *">
                <input
                  type="text"
                  value={fields.medName}
                  onChange={(e) => set('medName', e.target.value)}
                  placeholder="e.g. Metformin"
                  className={inputCls}
                />
              </Field>
              <Field label="Dose">
                <input
                  type="text"
                  value={fields.dose}
                  onChange={(e) => set('dose', e.target.value)}
                  placeholder="e.g. 500 mg"
                  className={inputCls}
                />
              </Field>
              <Field label="Given?">
                <div className="flex gap-3">
                  {[true, false].map((val) => (
                    <button
                      key={String(val)}
                      type="button"
                      onClick={() => set('given', val)}
                      className={[
                        'flex-1 py-2 rounded-lg border text-sm font-medium transition-colors',
                        fields.given === val
                          ? val
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-red-600 text-white border-red-600'
                          : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700',
                      ].join(' ')}
                    >
                      {val ? 'Yes ✓' : 'No ✗'}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notes">
                <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputCls} />
              </Field>
            </>
          )}

          {/* Appointment fields */}
          {type === 'appointment' && (
            <>
              <Field label="Title">
                <input type="text" value={fields.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Follow-up visit" className={inputCls} />
              </Field>
              <Field label="Provider *">
                <input type="text" value={fields.provider} onChange={(e) => set('provider', e.target.value)} placeholder="e.g. Dr. Smith" className={inputCls} />
              </Field>
              <Field label="Location">
                <input type="text" value={fields.location} onChange={(e) => set('location', e.target.value)} placeholder="e.g. City Hospital" className={inputCls} />
              </Field>
              <Field label="Date & Time">
                <input type="datetime-local" value={fields.appointmentDate} onChange={(e) => set('appointmentDate', e.target.value)} className={inputCls} />
              </Field>
              <Field label="Notes">
                <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputCls} />
              </Field>
            </>
          )}

          {/* Mood fields */}
          {type === 'mood' && (
            <>
              <Field label="How are they feeling?">
                <div className="flex gap-3 justify-center py-2">
                  {MOOD_OPTIONS.map(({ rating, emoji }) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => set('rating', rating)}
                      className={[
                        'text-3xl p-2 rounded-xl transition-all',
                        fields.rating === rating
                          ? 'scale-125 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-400'
                          : 'opacity-60 hover:opacity-100 hover:scale-110',
                      ].join(' ')}
                      title={`${rating}/5`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Notes">
                <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={2} className={inputCls} />
              </Field>
            </>
          )}

          {/* Note fields */}
          {type === 'note' && (
            <>
              <Field label="Title">
                <input type="text" value={fields.title} onChange={(e) => set('title', e.target.value)} placeholder="Optional title" className={inputCls} />
              </Field>
              <Field label="Notes *">
                <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={4} className={inputCls} />
              </Field>
            </>
          )}

          {/* Incident fields */}
          {type === 'incident' && (
            <>
              <Field label="Title *">
                <input type="text" value={fields.title} onChange={(e) => set('title', e.target.value)} placeholder="Brief description of incident" className={inputCls} />
              </Field>
              <Field label="Details">
                <textarea value={fields.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={inputCls} />
              </Field>
            </>
          )}

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              Save Entry
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
