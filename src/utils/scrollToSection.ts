import { luxuryScrollTo } from './luxuryScroll';

export const scrollToSection = (targetId: string) => {
  if (typeof window === 'undefined') return;

  if (targetId === 'home') {
    luxuryScrollTo(0, 1200);
    return;
  }

  const section = document.getElementById(targetId);
  if (!section) return;

  const rect = section.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

  const header = document.querySelector('header') as HTMLElement | null;
  const headerHeight = header?.offsetHeight ?? 0;

  const offsetPadding = -30;
  const targetPosition = Math.max(rect.top + scrollTop - headerHeight - offsetPadding, 0);

  luxuryScrollTo(targetPosition, 1200);
};

export const navigateToSection = (targetId: string, navigate: (path: string, options?: { state?: { scrollTo: string } }) => void, currentPath: string) => {
  const isHomePage = currentPath === '/';

  if (isHomePage) {
    scrollToSection(targetId);
  } else {
    if (targetId === 'home') {
      navigate('/');
    } else {
      navigate('/', { state: { scrollTo: targetId } });
    }
  }
};
