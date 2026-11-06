import { useState, useEffect, useLayoutEffect, useRef, type MouseEvent } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ToastProvider } from '../../contexts/ToastContext';
import { LogOut, Users, LayoutDashboard, Menu, X, MessageCircle, Settings2, ShieldCheck, BellRing } from 'lucide-react';
import {CrmActivityProvider,useCrmActivity} from './CrmActivityContext';
import DashboardVideoBackground from './ui/DashboardVideoBackground';
import ConciergeSignatureEntrance from './ui/ConciergeSignatureEntrance';
import { supabase } from '../../lib/supabase';
import { clearUserNoteDrafts } from '../../lib/crmNoteDrafts';

const NAV_ITEMS = [
  { to: '/dashboard',       label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/notifications', label: 'Notifications', icon: BellRing, end: true },
  { to: '/dashboard/leads', label: 'Leads',    icon: Users,            end: false },
  { to: '/dashboard/conversations', label: 'Conversations', icon: MessageCircle, end: false },
  { to: '/dashboard/settings', label: 'Settings', icon: Settings2, end: true },
  { to: '/dashboard/admin', label: 'Admin', icon: ShieldCheck, end: true, ownerOnly: true },
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

function DashboardLayoutInner() {
  const { signOut, avatarUrl, user } = useAuth();
  const {unreadCount,attentionCount}=useCrmActivity();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLoginRoute = pathname === '/dashboard/login';
  const mobileSection=pathname.startsWith('/dashboard/notifications')?'Notifications':pathname.startsWith('/dashboard/conversations')?'Conversations':pathname.startsWith('/dashboard/leads')?'Leads':pathname.startsWith('/dashboard/settings')?'Settings':pathname.startsWith('/dashboard/admin')?'Admin Dashboard':'Admin Dashboard';
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  useEffect(() => { if (isLoginRoute) setSigningOut(false); }, [isLoginRoute]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pageScrollRef = useRef<HTMLElement>(null);
  const previousPagePathRef = useRef(pathname);
  // Every dashboard route shares the same scroll surface. Reset it before
  // paint when navigating to another section, so prior scroll positions do
  // not carry over from Overview to Leads (or any other dashboard page).
  // Ignore search-parameter updates within a section, preserving lead drawer,
  // filter, refresh and in-page interaction positions.
  useLayoutEffect(() => {
    if (previousPagePathRef.current === pathname) return;
    previousPagePathRef.current = pathname;
    pageScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);
  const refreshAnimations = useRef<Animation[]>([]);
  // Re-play the same 420ms / 110ms luxury cascade only for explicitly
  // marked manual refresh buttons. Do not remount the route (that would discard
  // scroll position, form drafts, and other staff interaction state).
  const replayRefreshStagger = (event: MouseEvent<HTMLElement>) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const button = target.closest<HTMLButtonElement>('button[data-crm-refresh]');
    if (!button || button.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const outlet = event.currentTarget.querySelector<HTMLElement>(':scope > div');
    const page = outlet?.firstElementChild;
    if (!(page instanceof HTMLElement)) return;
    // Leads' four individually revealed sections are the approved reference.
    // Do not change that working cadence. Other pages have different DOM
    // structures: selecting every .ds-page-reveal accidentally picks just
    // one nested Admin card, while Notifications exposes only two outer cards.
    const directSections = () => Array.from(page.children).filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node.tagName !== 'STYLE'
    );
    let candidates: HTMLElement[];
    if (pathname.startsWith('/dashboard/leads') || pathname.startsWith('/dashboard/conversations')) {
      candidates = Array.from(page.querySelectorAll<HTMLElement>('.ds-page-reveal'));
    } else if (pathname.startsWith('/dashboard/notifications')) {
      // Reveal the same meaningful, discrete pieces users see on Leads:
      // page heading, activity heading, the two summary cards, controls,
      // then each visible activity entry. Avoid animating an ancestor and
      // its children simultaneously (double transforms look jumpy).
      candidates = [
        ...Array.from(page.querySelectorAll<HTMLElement>(':scope > div:first-child')),
        ...Array.from(page.querySelectorAll<HTMLElement>('#crm-activity > div:first-child')),
        ...Array.from(page.querySelectorAll<HTMLElement>('#crm-activity > div:nth-child(2) > div')),
        ...Array.from(page.querySelectorAll<HTMLElement>('#crm-activity > div:nth-child(3)')),
        ...Array.from(page.querySelectorAll<HTMLElement>('#crm-activity > div[aria-live] > article, #crm-activity > div[aria-live] > div')),
        ...Array.from(page.querySelectorAll<HTMLElement>('#crm-activity > p:last-child'))
      ];
    } else {
      // Settings and Admin have multiple distinct top-level panels. Their
      // nested .ds-page-reveal classes are mount animations, not a complete
      // representation of the cards that should replay on manual refresh.
      candidates = directSections();
    }
    refreshAnimations.current.forEach(animation => animation.cancel());
    refreshAnimations.current = candidates.slice(0, 12).map((section, index) =>
      section.animate(
        [{ opacity: 0, transform: 'translate3d(0,12px,0)' }, { opacity: 1, transform: 'translate3d(0,0,0)' }],
        { duration: 420, delay: Math.min(index, 7) * 110, easing: 'cubic-bezier(.22,1,.36,1)' }
      )
    );
  };
  useEffect(() => () => {
    refreshAnimations.current.forEach(animation => animation.cancel());
    refreshAnimations.current = [];
  }, [pathname]);


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
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    const accountId = user?.id;
    try {
    // Remove this browser's private push endpoint before ending its staff session.
    // Keep sign-out functional even when browser push is unavailable or offline.
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration('/dashboard/');
        const subscription = await registration?.pushManager?.getSubscription();
        if (subscription) {
          const { error } = await supabase.from('ai_concierge_push_subscriptions')
            .delete().eq('endpoint', subscription.endpoint);
          if (!error) await subscription.unsubscribe();
        }
      }
    } catch { /* Signing out must not depend on notification cleanup. */ }
    await signOut();
    if (accountId) clearUserNoteDrafts(accountId);
    setSidebarOpen(false);
    navigate('/dashboard/login', { replace: true });
    } catch {
      setSignOutError('Sign out failed. Please check your connection and retry.');
      setSigningOut(false);
    }
  };

  const closeSidebar = () => setSidebarOpen(false);

  // The login route is public. Never display dashboard sidebar, Overview,
  // navigation, or stale private content after sign-out.
  if (isLoginRoute) return <ToastProvider><Outlet /></ToastProvider>;
  if (signingOut) return (
    <div className="min-h-screen flex items-center justify-center text-sm" style={{background:'var(--ds-bg-base)',color:'var(--ds-gold-light)'}} role="status">Signing out…</div>
  );

  return (
    <ToastProvider>
    <div className="ds-shell isolate min-h-screen flex ds-dash-shell" style={{ background: 'var(--ds-bg-base)' }}>

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
        className="ds-dash-sidebar fixed top-0 left-0 h-full z-30 w-64 flex flex-col lg:!translate-x-0"
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
              data-crm-brand-target
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
          {NAV_ITEMS.filter(item=>!('ownerOnly' in item && item.ownerOnly)||user?.email?.toLowerCase()==='yourcustomerflowguy@gmail.com').map(({ to, label, icon: Icon, end }) => (
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
                  <span>{label}</span>{to==='/dashboard/notifications'&&unreadCount>0&&<span className="ml-auto rounded-full bg-[#803a30] px-2 py-0.5 text-[10px] font-semibold text-[#fff1de]" aria-label={unreadCount+' unread notifications'}>{unreadCount>99?'99+':unreadCount}</span>}
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
          {signOutError && <p role="alert" className="px-3 mt-2 text-xs text-red-300">{signOutError}</p>}
        </div>
      </aside>

      {/* Spacer so content doesn't go under the fixed sidebar on lg+ */}
      <div className="hidden lg:block w-64 shrink-0" />

      {/* ── Main content ──────────────────────────────────── */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0">

        {/* Mobile top bar — hidden on login route, which has its own full-screen layout */}
        <header
          className={`ds-dash-topbar ${isLoginRoute ? 'hidden' : 'lg:hidden'} sticky top-0 z-20 flex items-center gap-3 px-4 py-4 shrink-0`}
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <button onClick={() => setSidebarOpen(true)} className="shrink-0 rounded-lg p-1.5 transition-colors duration-150"
            style={{color:'var(--ds-text-secondary)'}} aria-label="Open sidebar">
            <Menu size={20}/>
          </button>
          {/* Keep a fixed, measurable logo position so the entrance animation has a stable destination. */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div data-crm-brand-target className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{background:'rgba(245,237,220,0.92)',boxShadow:'0 0 0 1px rgba(196,164,106,0.25)'}}>
              <img src="/images/md-logo.png" alt="Missy Dours" className="h-[25px] w-[25px] object-contain"/>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-medium uppercase tracking-[.13em]"
                style={{color:'var(--ds-text-tertiary)'}}>{mobileSection}</p>
              <p className="truncate text-[15px] font-semibold leading-tight"
                style={{fontFamily:"'Playfair Display', Georgia, serif",color:'var(--ds-text-primary)'}}>Missy Dours</p>
            </div>
          </div>
          <button type="button" onClick={()=>navigate('/dashboard/notifications')}
            aria-label={'Notifications: '+unreadCount+' unread alerts, '+attentionCount+' items need attention'}
            className="relative shrink-0 rounded-lg p-2 text-[#e1c18a]">
            <BellRing size={21}/>
            {unreadCount>0&&<span className="absolute -right-1 -top-1 rounded-full bg-[#7a3227] px-1.5 text-[10px] text-white">{unreadCount>99?'99+':unreadCount}</span>}
          </button>
        </header>

        {/* Page: retain Overview's own 110ms card stagger; apply matching
            section entrance timing to the other dashboard routes. */}
        <main ref={pageScrollRef} className="flex-1 overflow-y-auto animate-ds-fade-in" onClickCapture={replayRefreshStagger}>
          <style>{`
            @keyframes crmSectionEnter {
              from { opacity: 0; transform: translate3d(0, 12px, 0); }
              to { opacity: 1; transform: translate3d(0, 0, 0); }
            }
            .ds-crm-page-stagger > main > :nth-child(-n+12) {
              animation: crmSectionEnter 420ms cubic-bezier(.22,1,.36,1) both;
            }
            .ds-crm-page-stagger > main > :nth-child(1) {animation-delay:0ms}
            .ds-crm-page-stagger > main > :nth-child(2) {animation-delay:110ms}
            .ds-crm-page-stagger > main > :nth-child(3) {animation-delay:220ms}
            .ds-crm-page-stagger > main > :nth-child(4) {animation-delay:330ms}
            .ds-crm-page-stagger > main > :nth-child(5) {animation-delay:440ms}
            .ds-crm-page-stagger > main > :nth-child(6) {animation-delay:550ms}
            .ds-crm-page-stagger > main > :nth-child(7) {animation-delay:660ms}
            .ds-crm-page-stagger > main > :nth-child(n+8) {animation-delay:770ms}
            @media (prefers-reduced-motion: reduce) {
              .ds-crm-page-stagger > main > * {animation:none!important;}
            }
          `}</style>
          <div key={pathname} className={pathname==='/dashboard'?'':'ds-crm-page-stagger'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
    {!isLoginRoute && <ConciergeSignatureEntrance />}
    </ToastProvider>
  );
}

export default function DashboardLayout(){return <CrmActivityProvider><DashboardLayoutInner/></CrmActivityProvider>;}
