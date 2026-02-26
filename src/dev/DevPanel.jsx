import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { seedTestData, clearTestData } from '../firebase/seed';
import { DemoPlayer } from './DemoPlayer';

const ROLES = [
  { id: 'admin',     label: 'Admin',     active: 'bg-purple-600 text-white', inactive: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  { id: 'caregiver', label: 'Caregiver', active: 'bg-blue-600 text-white',   inactive: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'       },
  { id: 'family',    label: 'Family',    active: 'bg-green-600 text-white',  inactive: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'   },
  { id: 'patient',   label: 'Patient',   active: 'bg-amber-600 text-white',  inactive: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'   },
];

export function DevPanel() {
  const {
    firebaseUser,
    isDevMode,
    roleOverride,
    realRole,
    setRoleOverride,
    currentCircle,
  } = useAuth();
  const navigate = useNavigate();

  const [open,       setOpen]       = useState(false);
  const [status,     setStatus]     = useState('');
  const [working,    setWorking]    = useState(false);
  const [demoActive, setDemoActive] = useState(false);
  const [recorder,   setRecorder]   = useState(null); // MediaRecorder when recording

  // Only render for the designated dev UID
  if (!isDevMode) return null;

  const circleId   = currentCircle?.id;
  const activeRole = roleOverride ?? realRole;

  function handleRoleClick(roleId) {
    const isActive = activeRole === roleId;
    if (isActive) {
      // Clicking the active pill resets the override
      setRoleOverride(null);
      navigate(realRole === 'patient' ? '/patient' : '/dashboard');
    } else {
      setRoleOverride(roleId);
      if (roleId === 'patient') navigate('/patient');
      else if (roleOverride === 'patient' || realRole === 'patient') navigate('/dashboard');
    }
  }

  function handleReset() {
    setRoleOverride(null);
    navigate(realRole === 'patient' ? '/patient' : '/dashboard');
  }

  async function handleSeed() {
    if (!circleId) { setStatus('No circle — join one first.'); return; }
    setWorking(true);
    setStatus('Seeding…');
    try {
      const { events, logs } = await seedTestData(
        circleId,
        firebaseUser.uid,
        firebaseUser.displayName || 'Admin',
      );
      setStatus(`✓ Seeded ${events} events + ${logs} log entries.`);
    } catch (err) {
      console.error('Seed error:', err);
      setStatus('✗ Seed failed: ' + err.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleClear() {
    if (!circleId) { setStatus('No circle — join one first.'); return; }
    setWorking(true);
    setStatus('Clearing…');
    try {
      const { events, logs } = await clearTestData(circleId);
      setStatus(`✓ Cleared ${events} events + ${logs} log entries.`);
    } catch (err) {
      console.error('Clear error:', err);
      setStatus('✗ Clear failed: ' + err.message);
    } finally {
      setWorking(false);
    }
  }

  async function handleRecord() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      alert('Screen recording is not supported in this browser. Use Chrome or Edge.');
      return;
    }
    let stream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30, displaySurface: 'browser' },
        audio: false,
      });
    } catch {
      // User cancelled the screen-picker — do nothing
      return;
    }

    const mimeType = ['video/webm;codecs=vp9', 'video/webm', 'video/mp4']
      .find((t) => MediaRecorder.isTypeSupported(t)) || '';

    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    const chunks = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunks, { type: mimeType || 'video/webm' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = 'circle-of-care-demo.webm';
      a.click();
      URL.revokeObjectURL(url);
      setRecorder(null);
    };

    rec.start();
    setRecorder(rec);
    setOpen(false);
    setDemoActive(true);
  }

  function handleDemoExit() {
    recorder?.stop();
    setDemoActive(false);
  }

  return (
    <>
      {/* Dev mode banner — hidden during demo/recording so it doesn't appear on video */}
      {roleOverride && !demoActive && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-yellow-400 text-yellow-900 text-xs font-bold text-center py-1 flex items-center justify-center gap-2 select-none">
          DEV MODE — Viewing as {roleOverride.toUpperCase()}
          <button
            onClick={handleReset}
            className="ml-2 underline hover:no-underline"
          >
            [Reset]
          </button>
        </div>
      )}

      {/* Demo player */}
      {demoActive && <DemoPlayer onExit={handleDemoExit} />}

      {/* Floating wrench button — hidden while demo is running */}
      {!demoActive && (
        <button
          onClick={() => setOpen((o) => !o)}
          className="fixed bottom-4 right-4 z-[9998] w-10 h-10 rounded-full bg-gray-800 dark:bg-gray-700 text-white shadow-lg flex items-center justify-center text-lg hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
          title="Dev Panel"
        >
          🔧
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-16 right-4 z-[9998] w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Dev Panel
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* ── Persona section ── */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Persona</p>
            <div className="flex flex-wrap gap-1.5">
              {ROLES.map((role) => {
                const isActive = activeRole === role.id;
                const isReal   = realRole === role.id;
                return (
                  <button
                    key={role.id}
                    onClick={() => handleRoleClick(role.id)}
                    className={[
                      'px-2.5 py-1 rounded-full text-xs font-semibold transition-colors',
                      isActive ? role.active : role.inactive,
                    ].join(' ')}
                  >
                    {role.label}{isReal ? ' ★' : ''}
                  </button>
                );
              })}
            </div>
            {roleOverride ? (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1.5">
                Override active — click active pill or ★ to reset
              </p>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                ★ = your real Firestore role
              </p>
            )}
          </div>

          {/* ── Demo section ── */}
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Guided Demo</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setOpen(false); setDemoActive(true); }}
                className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 font-medium transition-colors"
              >
                ▶ Present
              </button>
              <button
                onClick={handleRecord}
                className="flex-1 text-xs bg-rose-600 hover:bg-rose-700 text-white rounded-lg py-1.5 font-medium transition-colors"
                title="Record screen while auto-playing — downloads .webm when done"
              >
                🔴 Record
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
              Present: step manually · Record: auto-plays &amp; saves video
            </p>
          </div>

          {/* ── Test data section ── */}
          <div>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Test Data</p>
            <div className="flex gap-2">
              <button
                onClick={handleSeed}
                disabled={working || !circleId}
                className="flex-1 text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg py-1.5 font-medium transition-colors"
              >
                Seed Test Data
              </button>
              <button
                onClick={handleClear}
                disabled={working || !circleId}
                className="flex-1 text-xs bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg py-1.5 font-medium transition-colors"
              >
                Clear Seeded
              </button>
            </div>
            {!circleId && (
              <p className="text-xs text-orange-500 mt-1">Join a circle first to use test data.</p>
            )}
            {status && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 break-words">{status}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
