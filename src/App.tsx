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

  return (
    <>
      {isHomePage && <GlobalVideoBackground />}
      <Navbar />

      {/* Global Navbar Spacer */}
      <div className="h-20 md:h-24" />

      <Outlet />
      <FloatingCallButton />
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
