import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvite, acceptInvite } from '../../firebase/circles';
import { signUp, signIn } from '../../firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';

export function AcceptInvite() {
  const { circleId, code } = useParams();
  const navigate = useNavigate();
  const { firebaseUser, refreshUser } = useAuth();

  const [invite, setInvite] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [loadingInvite, setLoadingInvite] = useState(true);

  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadInvite() {
      try {
        const inv = await getInvite(circleId, code);
        if (!inv) {
          setInviteError('Invite not found. Please check your link.');
        } else if (inv.used) {
          setInviteError('This invite has already been used.');
        } else if (inv.expiresAt?.toDate() < new Date()) {
          setInviteError('This invite has expired.');
        } else {
          setInvite(inv);
        }
      } catch {
        setInviteError('Failed to load invite. Please try again.');
      } finally {
        setLoadingInvite(false);
      }
    }
    loadInvite();
  }, [circleId, code]);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      let user = firebaseUser;

      if (!user) {
        if (mode === 'register') {
          user = await signUp(email, password, displayName.trim());
        } else {
          user = await signIn(email, password);
        }
      }

      await acceptInvite(circleId, code, user);
      await refreshUser();
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <Card className="max-w-md w-full text-center">
          <p className="text-4xl mb-4">🔗</p>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Invalid Invite</h2>
          <p className="text-gray-600 dark:text-gray-400">{inviteError}</p>
          <Button variant="secondary" className="mt-6 w-full" onClick={() => navigate('/login')}>
            Go to login
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400">Circle of Care</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            You&apos;ve been invited to join as{' '}
            <Badge role={invite.role} />
          </p>
        </div>

        <Card>
          {!firebaseUser && (
            <div className="flex mb-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button
                className={['flex-1 py-2 text-sm font-medium', mode === 'register' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'].join(' ')}
                onClick={() => setMode('register')}
              >
                Create account
              </button>
              <button
                className={['flex-1 py-2 text-sm font-medium', mode === 'login' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'].join(' ')}
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!firebaseUser && mode === 'register' && (
              <Input
                label="Your name"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                required
                placeholder="Jane Smith"
              />
            )}

            {!firebaseUser && (
              <>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </>
            )}

            {firebaseUser && (
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Accepting invite as <strong>{firebaseUser.displayName || firebaseUser.email}</strong>
              </p>
            )}

            {formError && (
              <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              Accept invitation
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
