import { useEffect } from 'react';
import { Routes, Route, Outlet, useLocation } from 'react-router-dom';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import FloatingCallButton from './components/ui/FloatingCallButton';
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';

function Layout() {
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  useEffect(() => {
    console.log('[Route] Navigation to:', location.pathname);
  }, [location.pathname]);

  return (
    <>
      {isHomePage && <GlobalVideoBackground />}
      <Navbar />
      <Outlet />
      <FloatingCallButton />
    </>
  );
}

export default function App() {
  console.log('[App] App component mounting');

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
