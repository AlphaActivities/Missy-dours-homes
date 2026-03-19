import { useState, useEffect, useCallback } from 'react';

export function useNavbarHeight() {
  const [navbarHeight, setNavbarHeight] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const updateNavbarHeight = useCallback(() => {
    const navbar = document.querySelector('header');
    if (navbar) {
      const height = navbar.getBoundingClientRect().height;
      setNavbarHeight(Math.ceil(height));
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    updateNavbarHeight();

    const navbar = document.querySelector('header');
    if (!navbar) return;

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        updateNavbarHeight();
      });
    });

    resizeObserver.observe(navbar);

    const handleResize = () => {
      requestAnimationFrame(() => {
        updateNavbarHeight();
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateNavbarHeight]);

  return { navbarHeight, isReady };
}
