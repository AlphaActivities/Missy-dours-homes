import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { LogOut, Users, LayoutDashboard, Menu, X, MessageCircle } from 'lucide-react';
import DashboardVideoBackground from './ui/DashboardVideoBackground';

const NAV_ITEMS = [
  { to: '/dashboard',       label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/leads', label: 'Leads',    icon: Users,            end: false },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageCircle, end: false },
];

// Avatar that renders the authenticated Google profile picture when
// available. When no picture URL exists (or the image fails to load),
// returns null so callers can omit the avatar entirely instead of
// showing an initial-letter fallback.
function UserAvatar({
  avatarUrl,
  size,
}: {
  avatarUrl: string | null;
  size: number;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = avatarUrl && !imgFailed;

  if (!showImage) return null;

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        border: '1px solid rgba(196,164,106,0.3)',
      }}
    >
      <img
        src={avatarUrl!}
        alt="Profile"
        className="w-full h-full object-cover"
        onError={() => setImgFailed(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export default function DashboardLayout() {
  const { signOut, avatarUrl } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoginRoute = pathname === '/dashboard/login';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Remove any overflow-hidden the public site may leave on body
  useEffect(() => {
    document.body.classList.remove('overflow-hidden');
  }, []);

  // Provide a separate installable identity for the staff CRM only.
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!manifest) return;
    const previous = manifest.href;
    const originalTitle = document.title;
    manifest.href = '/missy-crm.webmanifest';
    document.title = 'Missy Dours Private CRM';
    return () => {
      manifest.href = previous;
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
    void navigator.serviceWorker.register('/missy-crm-sw.js', {scope:'/dashboard/'})
      .catch(() => { /* Private CRM remains usable without notification support. */ });
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



  return (
    <ToastProvider>
    <div className="ds-shell min-h-screen flex ds-dash-shell" style={{ background: 'var(--ds-bg-base)' }}>

      {/* ── Cinematic background (desktop only) ──────────── */}
      <DashboardVideoBackground />

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
        className="ds-dash-sidebar fixed top-0 left-0 h-full z-30 w-64 flex flex-col lg:z-auto lg:!translate-x-0"
        style={{
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
            <div
              className="flex items-center justify-center rounded-xl shrink-0"
              style={{
                width: '40px',
                height: '40px',
                background: 'rgba(245,237,220,0.92)',
                boxShadow: '0 0 0 1px rgba(196,164,106,0.3)',
              }}
            >
              <img
                src="/images/md-logo.png"
                alt="Missy Dours"
                className="object-contain"
                style={{ width: '28px', height: '28px' }}
              />
            </div>
            <div>
              <p
                className="text-[10px] tracking-[0.18em] uppercase font-medium leading-none"
                style={{ color: 'var(--ds-text-tertiary)' }}
              >
                Admin Dashboard
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
          {/* Avatar (no email displayed) */}
          {avatarUrl && (
            <div className="flex items-center gap-3 px-3 py-2.5 mb-1">
              <UserAvatar avatarUrl={avatarUrl} size={28} />
            </div>
          )}

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

        {/* Mobile top bar — hidden on login route, which has its own full-screen layout */}
        <header
          className={`ds-dash-topbar ${isLoginRoute ? 'hidden' : 'lg:hidden'} flex items-center justify-between px-4 py-4 shrink-0`}
          style={{
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
            <div
              className="flex items-center justify-center rounded-lg shrink-0"
              style={{
                width: '32px',
                height: '32px',
                background: 'rgba(245,237,220,0.92)',
                boxShadow: '0 0 0 1px rgba(196,164,106,0.25)',
              }}
            >
              <img
                src="/images/md-logo.png"
                alt="Missy Dours"
                className="object-contain"
                style={{ width: '22px', height: '22px' }}
              />
            </div>
            <span
              className="text-sm font-semibold tracking-tight"
              style={{ fontFamily: "'Playfair Display', Georgia, serif", color: 'var(--ds-text-primary)' }}
            >
              Missy Dours
            </span>
          </div>

          {/* Avatar — only shown when a real Google profile photo exists */}
          {avatarUrl && <UserAvatar avatarUrl={avatarUrl} size={32} />}
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
