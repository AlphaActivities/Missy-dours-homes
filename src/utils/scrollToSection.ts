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

  // Navbar/CTA targets align the FIRST VISIBLE CONTENT, not the section's
  // padded outer edge. The property-category selection behavior stays unchanged.
  const contentTargets = new Set(['about', 'communities', 'testimonials', 'contact']);
  let destination: Element = section;
  if (!options?.categorySelection && contentTargets.has(targetId)) {
    if (targetId === 'about' || targetId === 'contact') {
      destination = section.querySelector('.grid') ?? section;
    } else {
      const heading = section.querySelector('h2');
      destination = heading?.parentElement ?? section;
    }
  }

  const contentNavigation = !options?.categorySelection && contentTargets.has(targetId);
  const breathingRoom = window.innerWidth >= 1024 ? 32 : window.innerWidth >= 768 ? 24 : 20;
  const desktopCategoryShift = options?.categorySelection && window.innerWidth >= 1024 ? 24 : 0;
  const offsetPadding = contentNavigation ? breathingRoom : -30 - desktopCategoryShift;
  const rect = destination.getBoundingClientRect();
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
