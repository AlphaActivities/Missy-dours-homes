import { useEffect, useState } from 'react';

const SESSION_KEY = 'app-navigation-state';

export function isPageRefreshed(): boolean {
  if (typeof window === 'undefined') return false;

  const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];

  if (navEntries.length > 0) {
    return navEntries[0].type === 'reload';
  }

  const hasNavigationState = sessionStorage.getItem(SESSION_KEY);
  if (!hasNavigationState) {
    sessionStorage.setItem(SESSION_KEY, 'active');
    return true;
  }

  return false;
}

export function useRefreshDetection(): boolean {
  const [isRefreshed, setIsRefreshed] = useState(false);

  useEffect(() => {
    setIsRefreshed(isPageRefreshed());
  }, []);

  return isRefreshed;
}
