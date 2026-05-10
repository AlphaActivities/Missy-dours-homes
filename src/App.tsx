import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback, useRef } from 'react';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import FloatingCallButton from './components/ui/FloatingCallButton';
import ListingTransitionOverlay from './components/ui/ListingTransitionOverlay';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';
  const csInitialPageViewSentRef = useRef(false);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    heroImage?: string;
    title?: string;
    price?: string;
  } | null>(null);

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

  useEffect(() => {
    const state = location.state as any;
    const isListingDetailPage = location.pathname.startsWith('/listings/') && location.pathname !== '/listings';

    if (isListingDetailPage && state?.transitionPreview) {
      setTransitionData(state.transitionPreview);
      setShowTransition(true);
    } else {
      setShowTransition(false);
      setTransitionData(null);
    }
  }, [location]);

  const handleDismiss = useCallback(() => {
    setShowTransition(false);
  }, []);

  return (
    <>
      {isHomePage && <GlobalVideoBackground />}
      <Navbar />
      <Outlet />
      <FloatingCallButton />
      <ListingTransitionOverlay
        isVisible={showTransition}
        heroImage={transitionData?.heroImage}
        title={transitionData?.title}
        price={transitionData?.price}
        onDismiss={handleDismiss}
      />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/listings" element={<ListingsPage />} />
        <Route path="/listings/:slug" element={<ListingDetailPage />} />
      </Route>
    </Routes>
  );
}
