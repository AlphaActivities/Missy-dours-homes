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

  const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
  const header = document.querySelector('header') as HTMLElement | null;
  const headerHeight = header?.getBoundingClientRect().height ?? 0;

  // These navigation destinations contain slide-up Framer Motion children.
  // Target the stable, untransformed section content wrapper instead of the
  // animated heading or the padded outer section.
  const isContentNavigation = !options?.categorySelection &&
    ['about', 'communities', 'testimonials', 'contact'].includes(targetId);
  const contentWrapper = isContentNavigation
    ? section.firstElementChild as HTMLElement | null
    : null;
  const destination = contentWrapper ?? section;
  const rect = destination.getBoundingClientRect();

  // Maintain the existing, approved property-category scroll calculation.
  const desktopCategoryShift = options?.categorySelection && window.innerWidth >= 1024 ? 24 : 0;
  const originalPadding = -30 - desktopCategoryShift;
  const clearance = window.innerWidth >= 1024 ? 36 : window.innerWidth >= 768 ? 28 : 24;
  const offsetPadding = isContentNavigation ? clearance : originalPadding;
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
