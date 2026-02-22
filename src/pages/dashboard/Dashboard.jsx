import { useState, useEffect } from 'react';
import { isToday } from 'date-fns';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { subscribeToLogs } from '../../firebase/logs';
import { subscribeToEvents } from '../../firebase/events';
import { LogEntry } from '../../components/LogEntry';
import { AddLogModal } from '../../components/AddLogModal';
import { EventCard } from '../../components/EventCard';

export function Dashboard() {
  const { userDoc, currentCircle, isAdmin } = useAuth();
  const { isDetailed } = useTheme();
  const circleId = currentCircle?.id;

  const [recentLogs, setRecentLogs] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!circleId) return;
    const unsub = subscribeToLogs(circleId, setRecentLogs, 5);
    return unsub;
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    const unsub = subscribeToEvents(circleId, setAllEvents);
    return unsub;
  }, [circleId]);

  const todayEvents = allEvents.filter(
    (e) => e.eventDate && isToday(e.eventDate.toDate()),
  ).slice(0, 3);

  const greeting = getGreeting();

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {greeting}, {userDoc?.displayName?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          {currentCircle
            ? `${currentCircle.name} — caring for ${currentCircle.patientName}`
            : 'Welcome to your care circle'}
        </p>
      </div>

      {/* Role card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Your role</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Badge role={userDoc?.role} />
              {isDetailed && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {getRoleDescription(userDoc?.role)}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {currentCircle && (
          <Card>
            <CardHeader>
              <CardTitle>Care circle</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong className="text-gray-900 dark:text-gray-100">{currentCircle.name}</strong>
              </p>
              {isDetailed && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Patient: {currentCircle.patientName}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {isAdmin && (
          <Card className="border-dashed">
            <CardContent>
              <div className="text-center py-2">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Invite caregivers and family members to join your circle.
                </p>
                <Link to="/admin/invite">
                  <Button size="sm" variant="secondary">
                    Invite members
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Today's Events */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Today's Events</CardTitle>
            <Link
              to="/calendar"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View calendar →
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {todayEvents.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <p className="text-3xl mb-2">📅</p>
              <p className="text-sm">No events today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayEvents.map((event) => (
                <EventCard key={event.id} event={event} circleId={circleId} compact />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button size="sm" onClick={() => setShowModal(true)}>+ Add Entry</Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-medium">No activity yet — add the first entry</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <LogEntry key={log.id} log={log} circleId={circleId} />
              ))}
              <div className="pt-1 text-center">
                <Link
                  to="/logs"
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View all →
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showModal && (
        <AddLogModal circleId={circleId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getRoleDescription(role) {
  switch (role) {
    case 'admin': return 'You manage this circle and can invite members.';
    case 'caregiver': return 'You provide hands-on care and can log activities.';
    case 'family': return 'You can view updates and stay connected.';
    case 'patient': return 'This circle is here to support you.';
    default: return '';
  }
}
