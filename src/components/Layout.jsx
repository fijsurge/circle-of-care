import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from '../firebase/auth';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

export function Layout() {
  const { userDoc, currentCircle, isAdmin } = useAuth();
  const dashboardTo = userDoc?.role === 'patient' ? '/patient' : '/dashboard';
  const navItems = [
    { to: dashboardTo, label: 'Dashboard', icon: '🏠' },
    { to: '/logs', label: 'Activity Log', icon: '📋' },
    { to: '/admin/invite', label: 'Invite Members', icon: '✉️', adminOnly: true },
  ];
  const { isDark, toggleTheme, isDetailed, toggleComplexity } = useTheme();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  function handleNavClick() {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style: ImpactStyle.Light });
    }
  }

  const visibleNav = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Top header */}
      <header
        className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">Circle of Care</span>
            {currentCircle && (
              <span className="hidden sm:inline text-sm text-gray-500 dark:text-gray-400">
                — {currentCircle.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Complexity toggle */}
            <button
              onClick={toggleComplexity}
              title={isDetailed ? 'Switch to simple view' : 'Switch to detailed view'}
              className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isDetailed ? 'Detailed' : 'Simple'}
            </button>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle dark mode"
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {isDark ? '☀️' : '🌙'}
            </button>

            {/* User info */}
            {userDoc && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-medium">{userDoc.displayName}</span>
                  <Badge role={userDoc.role} />
                </div>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto flex">
        {/* Sidebar (desktop) */}
        <aside className="hidden md:flex flex-col w-56 min-h-[calc(100vh-57px)] border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 gap-1">
          {visibleNav.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={handleNavClick}
              className={({ isActive }) => [
                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700',
              ].join(' ')}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile, Capacitor-ready) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {visibleNav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={handleNavClick}
            className={({ isActive }) => [
              'flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors',
              isActive
                ? 'text-blue-600 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400',
            ].join(' ')}
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
