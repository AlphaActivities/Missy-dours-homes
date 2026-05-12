import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { LogOut, Users, LayoutDashboard, Menu, X } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',       label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/leads', label: 'Leads',    icon: Users,            end: false },
];

export default function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Remove any overflow-hidden the public site may leave on body
  useEffect(() => {
    document.body.classList.remove('overflow-hidden');
  }, []);

  // Close drawer on lg+ resize
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/dashboard/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  const avatarLetter = user?.email ? user.email[0].toUpperCase() : '?';

  return (
    <ToastProvider>
    <div className="ds-shell min-h-screen flex" style={{ background: 'var(--ds-bg-base)' }}>

      {/* ── Mobile overlay ────────────────────────────────── */}
      <div
        ref={overlayRef}
        onClick={closeSidebar}
        className="lg:hidden fixed inset-0 z-20 transition-opacity duration-250 ease-out"
        style={{
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
          pointerEvents: sidebarOpen ? 'auto' : 'none',
          opacity: sidebarOpen ? 1 : 0,
        }}
      />

      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside
        className="fixed top-0 left-0 h-full z-30 w-64 flex flex-col lg:static lg:z-auto lg:!translate-x-0"
        style={{
          background: 'var(--ds-bg-raised)',
          boxShadow: 'var(--ds-shadow-card), 1px 0 0 rgba(255,255,255,0.04)',
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: `transform 320ms var(--ds-ease-drawer-in)`,
        }}
      >
        {/* Sidebar: Brand header */}
        <div
          className="flex items-center justify-between px-5 py-5"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/images/md-logo.png"
              alt="Missy Dours"
              className="h-9 w-auto object-contain"
              style={{ filter: 'brightness(0.92) sepia(0.1)' }}
            />
            <div>
              <p
                className="text-[11px] tracking-[0.22em] uppercase font-medium leading-none"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                Private
              </p>
              <p
                className="text-sm font-semibold tracking-tight mt-0.5"
                style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--ds-text-primary)' }}
              >
                Missy Dours
              </p>
            </div>
          </div>
          <button
            onClick={closeSidebar}
            className="lg:hidden p-1.5 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ds-text-tertiary)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--ds-text-primary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--ds-text-tertiary)')}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Sidebar: Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p
            className="px-3 mb-3 text-[10px] tracking-[0.22em] uppercase font-medium"
            style={{ color: 'var(--ds-text-tertiary)' }}
          >
            Navigation
          </p>
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ${
                  isActive ? 'ds-nav-active' : 'ds-nav-inactive'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    style={{ color: isActive ? 'var(--ds-gold)' : 'var(--ds-text-tertiary)' }}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Sidebar: User section */}
        <div
          className="px-3 py-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          {/* Avatar + email */}
          <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: 'var(--ds-gold-muted)',
                border: '1px solid rgba(196,164,106,0.3)',
                color: 'var(--ds-gold)',
              }}
            >
              {avatarLetter}
            </div>
            <p
              className="text-xs truncate"
              style={{ color: 'var(--ds-text-tertiary)' }}
            >
              {user?.email}
            </p>
          </div>

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-150 ds-nav-inactive"
            style={{ color: 'var(--ds-text-secondary)' }}
          >
            <LogOut size={14} style={{ color: 'var(--ds-text-tertiary)' }} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Spacer so content doesn't go under the fixed sidebar on lg+ */}
      <div className="hidden lg:block w-64 shrink-0" />

      {/* ── Main content ──────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Mobile top bar */}
        <header
          className="lg:hidden flex items-center justify-between px-4 py-4 shrink-0"
          style={{
            background: 'var(--ds-bg-raised)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg transition-colors duration-150"
            style={{ color: 'var(--ds-text-secondary)' }}
            aria-label="Open sidebar"
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2.5">
            <img src="/images/md-logo.png" alt="Missy Dours" className="h-7 w-auto object-contain" />
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--ds-text-primary)' }}
            >
              Missy Dours
            </span>
          </div>

          {/* Avatar button */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold"
            style={{
              background: 'var(--ds-gold-muted)',
              border: '1px solid rgba(196,164,106,0.25)',
              color: 'var(--ds-gold)',
            }}
          >
            {avatarLetter}
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto animate-ds-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
    </ToastProvider>
  );
}
