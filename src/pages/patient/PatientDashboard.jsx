import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getCircleMembers } from '../../firebase/circles';
import { subscribeToLogs } from '../../firebase/logs';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LogEntry } from '../../components/LogEntry';
import { AddLogModal } from '../../components/AddLogModal';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function PatientDashboard() {
  const { firebaseUser, userDoc, currentCircle } = useAuth();
  const circleId = userDoc?.circleId;

  const [members, setMembers] = useState([]);
  const [recentLogs, setRecentLogs] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const firstName = userDoc?.displayName?.split(' ')[0] ?? '';

  useEffect(() => {
    if (!circleId) return;
    getCircleMembers(circleId).then(setMembers).catch(console.error);
  }, [circleId]);

  useEffect(() => {
    if (!circleId) return;
    const unsub = subscribeToLogs(circleId, setRecentLogs, 5);
    return unsub;
  }, [circleId]);

  const caregivers = members.filter(m => m.uid !== firebaseUser?.uid);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {greeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        {currentCircle && (
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            {currentCircle.name} — you are being cared for
          </p>
        )}
      </div>

      {/* Card 1: Who is caring for me */}
      <Card>
        <CardHeader>
          <CardTitle>Who is caring for me</CardTitle>
        </CardHeader>
        <CardContent>
          {caregivers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No other members have joined yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {caregivers.map(m => (
                <li key={m.uid} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {m.displayName}
                  </span>
                  <Badge role={m.role} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Card 2: Recent activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent activity</CardTitle>
            <Button size="sm" onClick={() => setShowModal(true)}>
              + Add Entry
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">No activity yet.</p>
          ) : (
            <div className="space-y-3">
              {recentLogs.map(log => (
                <LogEntry key={log.id} log={log} circleId={circleId} />
              ))}
            </div>
          )}
          <div className="mt-4">
            <Link
              to="/logs"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all →
            </Link>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <AddLogModal circleId={circleId} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
