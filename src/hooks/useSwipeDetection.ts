import { useEffect, useRef, useState } from 'react';

interface SwipeDetectionOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number;
  touchOnly?: boolean;
}

export function useSwipeDetection({
  onSwipeLeft,
  onSwipeRight,
  threshold = 80,
  touchOnly = true,
}: SwipeDetectionOptions) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = threshold;

  const onTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }

    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !touchOnly) return;

    element.addEventListener('touchstart', onTouchStart, { capture: true });
    element.addEventListener('touchmove', onTouchMove, { capture: true });
    element.addEventListener('touchend', onTouchEnd, { capture: true });

    return () => {
      element.removeEventListener('touchstart', onTouchStart, { capture: true });
      element.removeEventListener('touchmove', onTouchMove, { capture: true });
      element.removeEventListener('touchend', onTouchEnd, { capture: true });
    };
  }, [touchStart, touchEnd, onSwipeLeft, onSwipeRight]);

  return elementRef;
}
