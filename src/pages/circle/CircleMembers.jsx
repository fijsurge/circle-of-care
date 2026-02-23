import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { subscribeToMembers } from '../../firebase/circles';

const ROLE_META = {
  admin:     { label: 'Admin',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  caregiver: { label: 'Caregiver', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'       },
  family:    { label: 'Family',    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'   },
  patient:   { label: 'Patient',   color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'   },
};

const ROLE_ORDER = ['admin', 'caregiver', 'family', 'patient'];

const AVATAR_COLORS = [
  'bg-purple-500', 'bg-blue-500', 'bg-green-500', 'bg-amber-500',
  'bg-pink-500',   'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name) {
  let hash = 0;
  for (const ch of (name || '')) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(ts) {
  if (!ts) return null;
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function CircleMembers() {
  const { currentCircle, firebaseUser, isAdmin } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCircle?.id) return;
    const unsub = subscribeToMembers(currentCircle.id, (m) => {
      setMembers(m);
      setLoading(false);
    });
    return unsub;
  }, [currentCircle?.id]);

  const sorted = [...members].sort((a, b) => {
    const diff = ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role);
    if (diff !== 0) return diff;
    return (a.displayName || '').localeCompare(b.displayName || '');
  });

  // Group counts for the summary bar
  const counts = members.reduce((acc, m) => {
    acc[m.role] = (acc[m.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Circle Members</h1>
          {currentCircle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {currentCircle.name}
              {currentCircle.patientName ? ` · caring for ${currentCircle.patientName}` : ''}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link
            to="/admin/invite"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
          >
            ✉️ Invite
          </Link>
        )}
      </div>

      {/* Summary chips */}
      {!loading && members.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ROLE_ORDER.filter((r) => counts[r]).map((role) => {
            const meta = ROLE_META[role];
            return (
              <span key={role} className={`text-xs font-medium px-2.5 py-1 rounded-full ${meta.color}`}>
                {counts[role]} {meta.label}{counts[role] !== 1 ? (role === 'family' ? '' : 's') : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* Member list */}
      {loading ? (
        <p className="text-gray-400 dark:text-gray-500 py-8 text-center">Loading members…</p>
      ) : sorted.length === 0 ? (
        <p className="text-gray-400 dark:text-gray-500 py-8 text-center">No members found.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((member) => {
            const isYou  = member.uid === firebaseUser?.uid;
            const meta   = ROLE_META[member.role] ?? ROLE_META.family;
            const joined = formatDate(member.joinedAt);

            return (
              <div
                key={member.uid}
                className="flex items-center gap-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm px-4 py-3"
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0 ${avatarColor(member.displayName)}`}
                >
                  {initials(member.displayName)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {member.displayName}
                    </span>
                    {isYou && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">you</span>
                    )}
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  {member.email && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                      {member.email}
                    </p>
                  )}
                  {joined && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      Joined {joined}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
