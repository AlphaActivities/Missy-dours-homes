import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import FloatingCallButton from './components/ui/FloatingCallButton';
import ListingTransitionOverlay from './components/ui/ListingTransitionOverlay';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import { usePageTracking } from './hooks/usePageTracking';
import CookieNotice from './components/ui/CookieNotice';

function Layout() {
  const location = useLocation();
  usePageTracking();
  const isHomePage = location.pathname === '/';
  const [showTransition, setShowTransition] = useState(false);
  const [transitionData, setTransitionData] = useState<{
    heroImage?: string;
    title?: string;
    price?: string;
  } | null>(null);

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
      <CookieNotice />
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
