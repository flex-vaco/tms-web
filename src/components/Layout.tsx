import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './ui/Avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsService } from '../services/notifications.service';
import { useToast } from '../context/ToastContext';

interface NavItem {
  path: string;
  label: string;
  icon: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/timesheet', label: 'Timesheet', icon: '⏱' },
  { path: '/approvals', label: 'Approvals', icon: '✓', roles: ['MANAGER', 'ADMIN'] },
  { path: '/reports', label: 'Reports', icon: '📊', roles: ['MANAGER', 'ADMIN'] },
  { path: '/admin', label: 'Admin', icon: '⚙', roles: ['MANAGER', 'ADMIN'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsService.list,
    refetchInterval: 30000,
  });
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleLogout = async () => {
    await logout();
    queryClient.clear();
    toast('Logged out successfully', 'info');
    navigate('/login');
  };

  const visibleNav = navItems.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${sidebarOpen ? 'w-56' : 'w-16'} flex flex-col bg-brand-primary-dk text-white transition-all duration-200 flex-shrink-0`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
          <div className="w-8 h-8 bg-brand-secondary rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-white">
            HI
          </div>
          {sidebarOpen && (
            <span className="font-semibold text-sm">
              Highspring India<span className="text-brand-secondary"> TMS</span>
            </span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {visibleNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <span className="text-base flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Toggle */}
        <button
          onClick={() => setSidebarOpen((p) => !p)}
          className="px-4 py-3 text-white/40 hover:text-white hover:bg-white/10 text-xs border-t border-white/10"
        >
          {sidebarOpen ? '◀' : '▶'}
        </button>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 flex-shrink-0">
          <h1 className="text-sm font-medium text-gray-500">
            {visibleNav.find((n) => location.pathname === n.path || (location.pathname.startsWith(n.path) && n.path !== '/'))?.label ?? 'Dashboard'}
          </h1>
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((p) => !p)}
                className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-danger text-white rounded-full text-xs flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-40">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="text-sm font-semibold">Notifications</span>
                    <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600 text-sm">✕</button>
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications</p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div key={n.id} className={`px-4 py-3 text-sm ${n.read ? 'text-gray-500' : 'text-gray-800 font-medium bg-blue-50/50'}`}>
                          <p>{n.message}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleDateString()}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User */}
            {user && (
              <div className="flex items-center gap-2">
                <Avatar name={user.name} size="sm" />
                {sidebarOpen && (
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-medium text-gray-800">{user.name}</p>
                    <p className="text-xs text-gray-400 capitalize">{user.role.toLowerCase()}</p>
                  </div>
                )}
                <button
                  onClick={handleLogout}
                  className="ml-2 text-xs text-gray-400 hover:text-brand-danger px-2 py-1 rounded hover:bg-red-50"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
