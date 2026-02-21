import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { createInvite } from '../../firebase/circles';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

const ROLES = [
  { value: 'caregiver', label: 'Caregiver', description: 'Professional or primary hands-on caregiver' },
  { value: 'family', label: 'Family member', description: 'Family or friends who want to stay updated' },
  { value: 'patient', label: 'Patient', description: 'The person receiving care — can view all logs and self-report mood' },
];

export function InviteMembers() {
  const { userDoc, currentCircle } = useAuth();
  const [selectedRole, setSelectedRole] = useState('caregiver');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!userDoc?.circleId) return;
    setError('');
    setGeneratedLink('');
    setLoading(true);

    try {
      const code = await createInvite(userDoc.circleId, userDoc.id, selectedRole);
      const baseUrl = window.location.origin;
      setGeneratedLink(`${baseUrl}/invite/${userDoc.circleId}/${code}`);
    } catch (err) {
      console.error(err);
      setError('Failed to generate invite. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Invite members</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Generate a link to invite people to join {currentCircle?.name}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Select role</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {ROLES.map(role => (
              <label
                key={role.value}
                className={[
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  selectedRole === role.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                ].join(' ')}
              >
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  checked={selectedRole === role.value}
                  onChange={() => setSelectedRole(role.value)}
                  className="mt-0.5"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">{role.label}</span>
                    <Badge role={role.value} />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{role.description}</p>
                </div>
              </label>
            ))}
          </div>

          <Button
            onClick={handleGenerate}
            loading={loading}
            className="mt-4 w-full"
          >
            Generate invite link
          </Button>

          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
        </CardContent>
      </Card>

      {generatedLink && (
        <Card>
          <CardHeader>
            <CardTitle>Invite link</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Share this link. It expires in 7 days and can only be used once.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 bg-gray-100 dark:bg-gray-900 rounded px-3 py-2 text-xs break-all text-gray-800 dark:text-gray-200">
                {generatedLink}
              </code>
              <Button variant="secondary" size="sm" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
