declare global { interface Window { _uxa?: unknown[] } }
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import FloatingCallButton from './components/ui/FloatingCallButton';
import BackToTopButton from './components/ui/BackToTopButton';
import ConciergeWidget from './components/ui/ConciergeWidget';
import ListingTransitionOverlay from './components/ui/ListingTransitionOverlay';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './components/dashboard/ProtectedRoute';
import LoginPage from './pages/dashboard/LoginPage';
import ResetPasswordPage from './pages/dashboard/ResetPasswordPage';
import DashboardOverviewPage from './pages/dashboard/DashboardOverviewPage';
import LeadsPage from './pages/dashboard/LeadsPage';
import ConversationsPage from './pages/dashboard/ConversationsPage';
import CalendarPage from './pages/dashboard/CalendarPage';
import OwnerAdminPage from './pages/dashboard/OwnerAdminPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';
import ConciergePrivateQAPage from './pages/dashboard/ConciergePrivateQAPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const csInitialPageViewSentRef = useRef(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [mobileChatOpenToken, setMobileChatOpenToken] = useState(0);

  const transitionPreview = (location.state as any)?.transitionPreview;
  const isListingDetailRoute =
    location.pathname.startsWith('/listings/') && location.pathname !== '/listings';
  const showTransition =
    isListingDetailRoute && !!transitionPreview && !dismissedKeys.has(location.key);

  useEffect(() => {
    if (import.meta.env.DEV) {
      // DEV diagnostic: simulate what production would fire
      const rafId = requestAnimationFrame(() => {
        const payload = {
          page_path: location.pathname + location.search,
          page_title: document.title,
          page_location: window.location.href,
        };
        console.log('[GA4] page_view fired', payload);
        if (!csInitialPageViewSentRef.current) {
          csInitialPageViewSentRef.current = true;
          console.log('[CS] trackPageview skipped (initial mount handled by bootstrap)');
        } else {
          console.log('[CS] trackPageview fired', location.pathname + location.search);
        }
      });
      return () => cancelAnimationFrame(rafId);
    }

    const MAX_ATTEMPTS = 20;
    const RETRY_DELAY = 250;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout>;
    let rafId: number;

    const sendPageView = () => {
      // Use requestAnimationFrame so child route effects (document.title updates)
      // complete before we read document.title for the GA4 payload.
      rafId = requestAnimationFrame(() => {
        const payload = {
          page_path: location.pathname + location.search,
          page_title: document.title,
          page_location: window.location.href,
        };
        window.gtag('event', 'page_view', payload);
        // Contentsquare SPA route tracking
        window._uxa = window._uxa || [];
        if (!csInitialPageViewSentRef.current) {
          csInitialPageViewSentRef.current = true;
          // Initial mount: bootstrap script owns the first CS pageview — skip here
        } else {
          window._uxa.push(['trackPageview', location.pathname + location.search]);
        }
      });
    };

    const tryFire = () => {
      if (typeof window.gtag === 'function') {
        sendPageView();
        return;
      }
      attempt += 1;
      if (import.meta.env.DEV) {
        console.log('[GA4] retry attempt', attempt);
      }
      if (attempt < MAX_ATTEMPTS) {
        timeoutId = setTimeout(tryFire, RETRY_DELAY);
      }
    };

    tryFire();
    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(rafId);
    };
  }, [location.pathname, location.search]);

  const handleDismiss = useCallback(() => {
    setDismissedKeys((prev) => {
      const next = new Set(prev);
      next.add(location.key);
      return next;
    });
  }, [location.key]);

  const outletContext = useMemo(
    () => ({ transitionOverlayVisible: showTransition }),
    [showTransition],
  );

  return (
    // The public homepage needs its own stacking context: the video uses a
    // negative z-index so it sits behind content, but must remain ABOVE the
    // dark html/body/#root startup paint shared with the private CRM.
    <div className={isHomePage ? 'relative isolate min-h-screen' : 'min-h-screen'}>
      {isHomePage && <GlobalVideoBackground />}
      <Navbar />
      <Outlet context={outletContext} />
      {!conciergeOpen && <FloatingCallButton onOpenChat={() => setMobileChatOpenToken(n => n + 1)} />}
      {!conciergeOpen && <BackToTopButton />}
      <ConciergeWidget onOpenChange={setConciergeOpen} mobileOpenToken={mobileChatOpenToken} />
      <ListingTransitionOverlay
        isVisible={showTransition}
        heroImage={transitionPreview?.heroImage}
        title={transitionPreview?.title}
        price={transitionPreview?.price}
        onDismiss={handleDismiss}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public site */}
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/:slug" element={<ListingDetailPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
        </Route>

        {/* Dashboard — isolated layout, no public Navbar/Footer */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard/login" element={<LoginPage />} />
          <Route path="/dashboard/reset-password" element={<ResetPasswordPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardOverviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard/leads"
            element={
              <ProtectedRoute>
                <LeadsPage />
              </ProtectedRoute>
            }
          />
          <Route path="/dashboard/conversations" element={<ProtectedRoute><ConversationsPage /></ProtectedRoute>} />
          <Route path="/dashboard/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/dashboard/admin" element={<ProtectedRoute><OwnerAdminPage /></ProtectedRoute>} />
          <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
          <Route path="/dashboard/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/dashboard/concierge-qa" element={<ProtectedRoute><ConciergePrivateQAPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
