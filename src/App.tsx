import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import FloatingCallButton from './components/ui/FloatingCallButton';
import BackToTopButton from './components/ui/BackToTopButton';
import ListingTransitionOverlay from './components/ui/ListingTransitionOverlay';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/dashboard/DashboardLayout';
import ProtectedRoute from './components/dashboard/ProtectedRoute';
import LoginPage from './pages/dashboard/LoginPage';
import DashboardOverviewPage from './pages/dashboard/DashboardOverviewPage';
import LeadsPage from './pages/dashboard/LeadsPage';
import ConversationsPage from './pages/dashboard/ConversationsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const csInitialPageViewSentRef = useRef(false);
  const [dismissedKeys, setDismissedKeys] = useState<Set<string>>(new Set());

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
    <>
      {isHomePage && <GlobalVideoBackground />}
      <Navbar />
      <Outlet context={outletContext} />
      <FloatingCallButton />
      <BackToTopButton />
      <ListingTransitionOverlay
        isVisible={showTransition}
        heroImage={transitionPreview?.heroImage}
        title={transitionPreview?.title}
        price={transitionPreview?.price}
        onDismiss={handleDismiss}
      />
    </>
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
        </Route>
      </Routes>
    </AuthProvider>
  );
}
