import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { luxuryScrollToTop } from '../utils/luxuryScroll';

export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    luxuryScrollToTop(1400);
  }, [location.pathname]);

  return null;
}
