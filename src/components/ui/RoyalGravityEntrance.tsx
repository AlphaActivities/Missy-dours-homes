import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const ROYAL_GRAVITY_SEEN_KEY = 'missy_royal_gravity_entrance_v2';
const MIN_HOME_MS = 6000;
const AFTER_HERO_MS = 4000;
const ANIMATION_MS = 2700;

/**
 * One-shot, GPU-friendly visual entrance. The actual contact controls remain
 * mounted and unchanged; this decorative copy travels over measured content.
 */
export default function RoyalGravityEntrance({ onComplete }: { onComplete: () => void }) {
  const { pathname } = useLocation();
  const playedRef = useRef(false);
  const completeRef = useRef(onComplete);
  completeRef.current = onComplete;

  useEffect(() => {
    if (pathname !== '/' || playedRef.current) return;
    try {
      if (sessionStorage.getItem(ROYAL_GRAVITY_SEEN_KEY)) { playedRef.current = true; completeRef.current(); return; }
    } catch { /* Storage may be disabled. */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { completeRef.current(); return; }

    let afterHeroTimer: number | undefined;
    let homeTimer: number | undefined;
    let elapsed = false;
    let pastHero = false;
    let heroDelayFinished = false;
    let started = false;
    let disposed = false;
    let overlay: HTMLDivElement | null = null;
    let animation: Animation | null = null;
    let unlock: (() => void) | null = null;
    let safetyTimer: number | undefined;

    const cleanupAnimation = () => {
      window.clearTimeout(safetyTimer);
      animation?.cancel();
      animation = null;
      overlay?.remove();
      overlay = null;
      document.documentElement.classList.remove('royal-gravity-active');
      unlock?.();
      unlock = null;
      if (!disposed && started) completeRef.current();
    };

    const launch = () => {
      if (started || disposed || !elapsed || !pastHero || !heroDelayFinished || document.hidden) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { completeRef.current(); return; }
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const selector = mobile
        ? '[data-royal-gravity-launcher="mobile"]'
        : '[data-royal-gravity-launcher="desktop"]';
      const launcher = document.querySelector<HTMLElement>(selector);
      if (!launcher) { completeRef.current(); return; }
      const destination = launcher.getBoundingClientRect();
      if (destination.width < 30 || destination.height < 30) { completeRef.current(); return; }

      // Choose a visible card edge that can support the circular avatar.
      // The card is never moved or altered: only its geometry is sampled.
      const radius = destination.width / 2;
      const candidates = Array.from(document.querySelectorAll<HTMLElement>(
        '#choose-your-path .grid button, #featured-listings article, #mid-tier-homes article, #new-to-homeownership article'
      )).map(element => element.getBoundingClientRect()).filter(rect =>
        rect.width >= radius * 3 &&
        rect.top > radius * 1.5 &&
        rect.top < window.innerHeight - radius * 2 &&
        rect.right > radius * 3
      );
      const surface = candidates.sort((a, b) =>
        Math.abs(a.top - window.innerHeight * .57) - Math.abs(b.top - window.innerHeight * .57)
      )[0];
      const floorY = surface
        ? Math.min(window.innerHeight - radius * 1.3, surface.top - destination.height)
        : window.innerHeight - destination.height - 12;
      const startX = Math.max(10, Math.min(window.innerWidth * .12, 76));
      const endX = destination.left;
      const endY = destination.top;
      const landX = surface
        ? Math.max(startX + 12, Math.min(surface.left + radius, endX - 80))
        : Math.max(startX + 12, Math.min(window.innerWidth * .22, endX - 80));
      const dropY = Math.max(radius * 1.8, floorY);
      // Complete whole revolutions, never rotate backward or snap upright at the end.
      const revolutions = Math.max(1, Math.round(Math.max(0, endX - landX) / (Math.PI * destination.width)));
      const finalRotation = revolutions * 360;

      // Lock only for the short cinematic sequence, restoring the exact
      // scroll position and pre-existing inline styles afterward.
      const html = document.documentElement;
      const body = document.body;
      const previousHtmlOverflow = html.style.overflow;
      const previousBodyOverflow = body.style.overflow;
      const previousBodyTouchAction = body.style.touchAction;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;
      const preventTouch = (event: TouchEvent) => event.preventDefault();
      html.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      body.style.touchAction = 'none';
      document.addEventListener('touchmove', preventTouch, { passive: false });
      unlock = () => {
        html.style.overflow = previousHtmlOverflow;
        body.style.overflow = previousBodyOverflow;
        body.style.touchAction = previousBodyTouchAction;
        document.removeEventListener('touchmove', preventTouch);
        window.scrollTo(scrollX, scrollY);
      };

      started = true;
      playedRef.current = true;
      try { sessionStorage.setItem(ROYAL_GRAVITY_SEEN_KEY, '1'); } catch { /* no-op */ }

      overlay = document.createElement('div');
      overlay.className = 'royal-gravity-avatar';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.width = destination.width + 'px';
      overlay.style.height = destination.height + 'px';
      overlay.style.left = '0';
      overlay.style.top = '0';
      // Clone the exact existing launcher artwork so the handoff is seamless.
      overlay.innerHTML = launcher.innerHTML;
      document.body.appendChild(overlay);
      html.classList.add('royal-gravity-active');

      const point = (x: number, y: number, rotation: number, scale = 1) =>
        `translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(${scale})`;
      // Three progressively smaller bounces, then a measured roll and final drop.
      const frames: Keyframe[] = [
        { offset: 0, transform: point(startX, -destination.height * 1.4, -25), opacity: 0 },
        { offset: .10, transform: point(landX - 18, dropY - 78, -10), opacity: 1 },
        { offset: .20, transform: point(landX, dropY, 0, .93) },
        { offset: .275, transform: point(landX + 7, dropY - 54, 13) },
        { offset: .35, transform: point(landX + 14, dropY, 26, .96) },
        { offset: .405, transform: point(landX + 20, dropY - 24, 38) },
        { offset: .46, transform: point(landX + 26, dropY, 50, .98) },
        { offset: .495, transform: point(landX + 31, dropY - 8, 60) },
        { offset: .53, transform: point(landX + 36, dropY, 70) },
        // The last roll ends at a whole revolution, so the icon is upright.
        { offset: .81, transform: point(endX - 30, dropY, finalRotation - 28) },
        { offset: .92, transform: point(endX, endY + 4, finalRotation - 7, .97) },
        { offset: 1, transform: point(endX, endY, finalRotation), opacity: 1 }
      ];
      animation = overlay.animate(frames, {
        duration: ANIMATION_MS,
        easing: 'linear',
        fill: 'forwards'
      });
      safetyTimer = window.setTimeout(cleanupAnimation, ANIMATION_MS + 800);
      animation.finished.then(() => { if (!disposed) cleanupAnimation(); })
        .catch(() => { if (!disposed) cleanupAnimation(); });
    };

    const check = () => {
      if (started || disposed) return;
      const hero = document.getElementById('home');
      const nowPast = !!hero && hero.getBoundingClientRect().bottom <= 0;
      if (nowPast !== pastHero) {
        pastHero = nowPast;
        window.clearTimeout(afterHeroTimer);
        heroDelayFinished = false;
        if (pastHero) afterHeroTimer = window.setTimeout(() => { heroDelayFinished = true; launch(); }, AFTER_HERO_MS);
      }
    };
    const markReady = () => { elapsed = true; launch(); };
    homeTimer = window.setTimeout(markReady, MIN_HOME_MS);
    // Scroll is passive; no layout work runs continuously during the animation.
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
    return () => {
      disposed = true;
      window.clearTimeout(homeTimer);
      window.clearTimeout(afterHeroTimer);
      window.removeEventListener('scroll', check);
      window.removeEventListener('resize', check);
      cleanupAnimation();
    };
  }, [pathname]);

  return null;
}
