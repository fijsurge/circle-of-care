import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../../contexts/AuthContext';
import { updateDigestPrefs } from '../../firebase/settings';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';

export function NotificationSettings() {
  const { firebaseUser, userDoc, refreshUser } = useAuth();

  const savedPrefs = userDoc?.preferences?.digest;
  const [push, setPush] = useState(savedPrefs?.push ?? true);
  const [email, setEmail] = useState(savedPrefs?.email ?? true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isNative = Capacitor.isNativePlatform();

  async function handleToggle(field, value) {
    const newPush  = field === 'push'  ? value : push;
    const newEmail = field === 'email' ? value : email;
    if (field === 'push')  setPush(value);
    if (field === 'email') setEmail(value);

    setSaving(true);
    setSaved(false);
    try {
      await updateDigestPrefs(firebaseUser.uid, { push: newPush, email: newEmail });
      await refreshUser();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Notification Settings</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Choose how you receive your daily care circle digest.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Morning Digest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Sent at <strong>8:00 AM</strong> each day with a summary of today's events,
            who has claimed tasks, and anything that still needs attention.
          </p>

          {/* Push toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Push notification
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isNative
                  ? 'Delivered to this device.'
                  : 'Requires the mobile app — install on iOS or Android to enable.'}
              </p>
            </div>
            <Toggle
              checked={push}
              onChange={(v) => handleToggle('push', v)}
              disabled={saving || !isNative}
            />
          </div>

          {/* Email toggle */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Email
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Sent to <span className="font-medium">{userDoc?.email}</span>
              </p>
            </div>
            <Toggle
              checked={email}
              onChange={(v) => handleToggle('email', v)}
              disabled={saving}
            />
          </div>

          {saved && (
            <p className="text-xs text-green-600 dark:text-green-400">✓ Preferences saved</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>About the digest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>Each morning digest includes:</p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>All events scheduled for today</li>
            <li>Who has claimed each task</li>
            <li>Unclaimed tasks that need attention</li>
            <li>A direct link back to the calendar</li>
          </ul>
          <p className="pt-1 text-xs text-gray-400 dark:text-gray-500">
            Digests are only sent on days with at least one event.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        'relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent',
        'transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-40',
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition duration-200 ease-in-out',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  );
}
