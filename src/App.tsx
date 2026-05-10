import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
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
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    heroImage?: string;
    title?: string;
    price?: string;
  } | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) return;

    const MAX_ATTEMPTS = 10;
    const RETRY_DELAY = 250;
    let attempt = 0;
    let timeoutId: ReturnType<typeof setTimeout>;

    const sendPageView = () => {
      window.gtag('event', 'page_view', {
        page_path: location.pathname + location.search,
        page_title: document.title,
        page_location: window.location.href,
      });
    };

    const tryFire = () => {
      if (typeof window.gtag === 'function') {
        sendPageView();
        return;
      }
      attempt += 1;
      if (attempt < MAX_ATTEMPTS) {
        timeoutId = setTimeout(tryFire, RETRY_DELAY);
      }
    };

    tryFire();
    return () => clearTimeout(timeoutId);
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
