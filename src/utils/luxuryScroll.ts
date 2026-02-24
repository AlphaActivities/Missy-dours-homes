let isScrolling = false;
let animationFrameId: number | null = null;

export function cancelScroll() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  isScrolling = false;
}

export function luxuryScrollTo(targetY: number, duration: number = 1400) {
  if (isScrolling) {
    cancelScroll();
  }

  isScrolling = true;
  const startY = window.scrollY;
  const distance = targetY - startY;
  const startTime = performance.now();

  function easeOutQuart(t: number): number {
    return 1 - Math.pow(1 - t, 4);
  }

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutQuart(progress);
    const currentY = startY + distance * eased;

    window.scrollTo(0, currentY);

    if (progress < 1) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      isScrolling = false;
      animationFrameId = null;
    }
  }

  animationFrameId = requestAnimationFrame(animate);
}

export function luxuryScrollToTop(duration: number = 1400) {
  const initialOffset = window.innerHeight * 0.3;
  window.scrollTo({ top: initialOffset, behavior: 'instant' });

  requestAnimationFrame(() => {
    luxuryScrollTo(0, duration);
  });
}

export function luxuryScrollToElement(elementId: string, duration: number = 1200) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const targetY = element.offsetTop - 80;
  luxuryScrollTo(targetY, duration);
}
