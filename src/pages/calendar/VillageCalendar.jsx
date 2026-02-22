import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { isToday, isTomorrow, format } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToEvents } from '../../firebase/events';
import {
  isCronofyConfigured,
  getCronofyAuthUrl,
  exchangeCronofyCode,
  fetchBusyBlocks,
  disconnectCronofy,
  subscribeToBusyBlocks,
} from '../../firebase/cronofy';
import { EventCard } from '../../components/EventCard';
import { AddEventModal } from '../../components/AddEventModal';
import { Button } from '../../components/ui/Button';

function getDateLabel(date) {
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'EEE, MMM d');
}

function groupEventsByDate(events) {
  const groups = [];
  const seen = new Map();
  for (const event of events) {
    if (!event.eventDate) continue;
    const date = event.eventDate.toDate();
    const key = format(date, 'yyyy-MM-dd');
    if (!seen.has(key)) {
      seen.set(key, groups.length);
      groups.push({ key, label: getDateLabel(date), events: [] });
    }
    groups[seen.get(key)].events.push(event);
  }
  return groups;
}

function formatBlockTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// Returns only blocks that fall within today
function todayBlocks(blocks) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return blocks.filter((b) => {
    const s = new Date(b.start);
    return s >= start && s < end;
  });
}

export function VillageCalendar() {
  const { userDoc, currentCircle, firebaseUser, refreshUser } = useAuth();
  const circleId  = currentCircle?.id ?? userDoc?.circleId;
  const isPatient = userDoc?.role === 'patient';

  const [events, setEvents]         = useState([]);
  const [busyMembers, setBusyMembers] = useState([]);
  const [showModal, setShowModal]   = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cronofyReady   = isCronofyConfigured();
  const isConnected    = !!userDoc?.cronofyConnected;

  // ── Handle OAuth callback (?code=...) ─────────────────────────────────────
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code || !firebaseUser) return;

    // Remove code from URL immediately so a refresh doesn't re-trigger
    navigate('/calendar', { replace: true });

    setConnecting(true);
    setConnectMsg('');

    exchangeCronofyCode(code)
      .then(() => refreshUser())
      .then(() => {
        setConnectMsg('✓ Calendar connected!');
        if (circleId) fetchBusyBlocks(circleId).catch(console.error);
      })
      .catch((err) => {
        console.error('[cronofy] exchange failed:', err);
        setConnectMsg('Could not connect calendar — please try again.');
      })
      .finally(() => setConnecting(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Subscribe to circle events ─────────────────────────────────────────────
  useEffect(() => {
    if (!circleId) return;
    return subscribeToEvents(circleId, setEvents);
  }, [circleId]);

  // ── Subscribe to members' busy blocks ─────────────────────────────────────
  useEffect(() => {
    if (!circleId) return;
    return subscribeToBusyBlocks(circleId, setBusyMembers);
  }, [circleId]);

  // ── Fetch own busy blocks on mount if connected ────────────────────────────
  useEffect(() => {
    if (!circleId || !isConnected) return;
    fetchBusyBlocks(circleId).catch(console.error);
  }, [circleId, isConnected]);

  function handleConnect() {
    const url = getCronofyAuthUrl();
    if (url) window.location.href = url;
  }

  async function handleDisconnect() {
    if (!window.confirm('Disconnect your personal calendar?')) return;
    try {
      await disconnectCronofy();
      await refreshUser();
      setBusyMembers((prev) => prev.filter((m) => m.uid !== firebaseUser?.uid));
    } catch (err) {
      console.error('[cronofy] disconnect failed:', err);
    }
  }

  const groups = groupEventsByDate(events);

  // Today's busy blocks across all connected members
  const todayBusy = busyMembers
    .map((m) => ({ ...m, todayBlocks: todayBlocks(m.blocks ?? []) }))
    .filter((m) => m.todayBlocks.length > 0);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Village Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Upcoming events for {currentCircle?.name ?? 'your care circle'}
          </p>
        </div>
        {!isPatient && (
          <Button onClick={() => setShowModal(true)}>+ Add Event</Button>
        )}
      </div>

      {/* Cronofy banner */}
      {!isPatient && cronofyReady && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
          <span className="text-lg">🔗</span>
          {isConnected ? (
            <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
              <span className="text-green-700 dark:text-green-400 font-medium">
                ✓ Personal calendar connected
              </span>
              <Button size="sm" variant="ghost" onClick={handleDisconnect}>
                Disconnect
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-between flex-wrap gap-2">
              <span>Connect your personal calendar to share your availability.</span>
              <Button size="sm" variant="secondary" loading={connecting} onClick={handleConnect}>
                Connect Calendar
              </Button>
            </div>
          )}
        </div>
      )}

      {!isPatient && !cronofyReady && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-sm text-gray-500 dark:text-gray-400">
          <span className="text-lg">🔗</span>
          <span>
            <strong>Personal calendar sync — Coming Soon.</strong>{' '}
            Set <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">VITE_CRONOFY_CLIENT_ID</code> to enable.
          </span>
        </div>
      )}

      {/* Connection status message */}
      {connectMsg && (
        <p className={[
          'text-sm font-medium px-4 py-2 rounded-lg',
          connectMsg.startsWith('✓')
            ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
            : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
        ].join(' ')}>
          {connectMsg}
        </p>
      )}

      {/* Today's busy blocks */}
      {todayBusy.length > 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Member availability today
          </p>
          <div className="space-y-2">
            {todayBusy.map((member) => (
              <div key={member.uid} className="flex flex-wrap items-start gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0">
                  {member.displayName}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {member.todayBlocks.map((b, i) => (
                    <span
                      key={i}
                      className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-full"
                    >
                      Busy {formatBlockTime(b.start)}–{formatBlockTime(b.end)}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event list */}
      {groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-lg font-medium">No upcoming events</p>
          {!isPatient && (
            <p className="text-sm mt-1">
              <button
                onClick={() => setShowModal(true)}
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                Add the first event
              </button>
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.key}>
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.events.map((event) => (
                  <EventCard key={event.id} event={event} circleId={circleId} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AddEventModal circleId={circleId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
