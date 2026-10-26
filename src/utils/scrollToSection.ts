export const scrollToSection = (targetId: string, options?: { categorySelection?: boolean }) => {
  if (typeof window === 'undefined') return;

  if (targetId === 'home') {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
    return;
  }

  const section = document.getElementById(targetId);
  if (!section) return;

  const rect = section.getBoundingClientRect();
  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;

  const header = document.querySelector('header') as HTMLElement | null;
  const headerHeight = header?.offsetHeight ?? 0;

  // Scroll farther on desktop category selection only, moving content UP in the viewport.
  // Small screens and other navbar navigation retain the original -30px offset.
  const desktopCategoryShift = options?.categorySelection && window.innerWidth >= 1024 ? 24 : 0;
  const offsetPadding = -30 - desktopCategoryShift;
  const targetPosition = Math.max(rect.top + scrollTop - headerHeight - offsetPadding, 0);

  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth',
  });
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
