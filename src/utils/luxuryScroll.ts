function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

export function luxuryScrollTo(targetPosition: number, duration: number = 1400) {
  const startPosition = window.pageYOffset || document.documentElement.scrollTop;
  const distance = targetPosition - startPosition;
  const startTime = performance.now();

  function animation(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutQuart(progress);
    const position = startPosition + distance * eased;

    window.scrollTo({ top: position, behavior: 'auto' });

    if (progress < 1) {
      requestAnimationFrame(animation);
    }
  }

  requestAnimationFrame(animation);
}

export function luxuryScrollToTop(duration: number = 1400) {
  const initialOffset = window.innerHeight * 0.3;
  window.scrollTo({ top: initialOffset, behavior: 'instant' });

  requestAnimationFrame(() => {
    luxuryScrollTo(0, duration);
  });
}
