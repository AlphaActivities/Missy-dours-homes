import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const luxuriousScrollToTop = (duration: number = 1200) => {
  const start = window.pageYOffset;
  const startTime = performance.now();

  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  const animateScroll = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easing = easeInOutCubic(progress);

    window.scrollTo(0, start * (1 - easing));

    if (progress < 1) {
      requestAnimationFrame(animateScroll);
    }
  };

  requestAnimationFrame(animateScroll);
};

export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    luxuriousScrollToTop(1200);
  }, [pathname, search]);

  return null;
}
