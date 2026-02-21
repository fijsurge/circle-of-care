import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { createCircle } from '../../firebase/circles';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export function CreateCircle() {
  const { firebaseUser, userDoc, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [circleName, setCircleName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!circleName.trim() || !patientName.trim()) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    try {
      await createCircle(
        firebaseUser.uid,
        userDoc?.displayName || firebaseUser.displayName,
        firebaseUser.email,
        circleName.trim(),
        patientName.trim()
      );
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error(err);
      setError('Failed to create circle. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <p className="text-4xl mb-2">💙</p>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Create your Care Circle</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Set up a circle to coordinate care for your loved one.
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Circle name"
              value={circleName}
              onChange={e => setCircleName(e.target.value)}
              required
              placeholder="e.g. The Smith Family Circle"
            />

            <div>
              <Input
                label="Patient's name"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                required
                placeholder="e.g. Margaret Smith"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The person receiving care. You can add their account later.
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Create circle
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
