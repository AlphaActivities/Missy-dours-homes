export const scrollToSection = (targetId: string) => {
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

  const offsetPadding = -100;
  const targetPosition = Math.max(rect.top + scrollTop - headerHeight - offsetPadding, 0);

  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth',
  });
};
