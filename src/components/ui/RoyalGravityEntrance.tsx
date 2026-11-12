import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const SEEN_KEY = 'missy_royal_gravity_entrance_v1';
const MIN_HOME_MS = 6000;
const AFTER_HERO_MS = 4000;
const ANIMATION_MS = 2700;

/**
 * One-shot, GPU-friendly visual entrance. The actual contact controls remain
 * mounted and unchanged; this decorative copy travels over measured content.
 */
export default function RoyalGravityEntrance() {
  const { pathname } = useLocation();
  const playedRef = useRef(false);

  useEffect(() => {
    if (pathname !== '/' || playedRef.current) return;
    try {
      if (sessionStorage.getItem(SEEN_KEY)) { playedRef.current = true; return; }
    } catch { /* Storage may be disabled. */ }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

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

    const cleanupAnimation = () => {
      animation?.cancel();
      animation = null;
      overlay?.remove();
      overlay = null;
      document.documentElement.classList.remove('royal-gravity-active');
      unlock?.();
      unlock = null;
    };

    const launch = () => {
      if (started || disposed || !elapsed || !pastHero || !heroDelayFinished || document.hidden) return;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      const selector = mobile
        ? '[data-royal-gravity-launcher="mobile"]'
        : '[data-royal-gravity-launcher="desktop"]';
      const launcher = document.querySelector<HTMLElement>(selector);
      if (!launcher) return;
      const destination = launcher.getBoundingClientRect();
      if (destination.width < 30 || destination.height < 30) return;

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
      const degrees = Math.min(900, Math.max(0, endX - landX) / Math.max(1, destination.width * Math.PI) * 360);

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
      try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* no-op */ }

      overlay = document.createElement('div');
      overlay.className = 'royal-gravity-avatar';
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.width = destination.width + 'px';
      overlay.style.height = destination.height + 'px';
      overlay.style.left = '0';
      overlay.style.top = '0';
      overlay.innerHTML = mobile
        ? '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 21h28v22H28l-10 8v-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="47" cy="17" r="9" fill="#17130d" stroke="currentColor" stroke-width="2"/><path d="M47 12v10m-5-5h10" stroke="currentColor" stroke-width="2"/></svg>'
        : '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 20h30v23H28l-11 8v-8z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/></svg>';
      document.body.appendChild(overlay);
      html.classList.add('royal-gravity-active');

      const point = (x: number, y: number, rotation: number, scale = 1) =>
        `translate3d(${x}px,${y}px,0) rotate(${rotation}deg) scale(${scale})`;
      // Three progressively smaller bounces, then a measured roll and final drop.
      const frames: Keyframe[] = [
        { offset: 0, transform: point(startX, -destination.height * 1.4, -35), opacity: 0 },
        { offset: .10, transform: point(landX - 28, dropY - 95, -15), opacity: 1 },
        { offset: .21, transform: point(landX, dropY, 0, .92) },
        { offset: .29, transform: point(landX + 12, dropY - 66, 15) },
        { offset: .38, transform: point(landX + 22, dropY, 28, .95) },
        { offset: .45, transform: point(landX + 28, dropY - 31, 40) },
        { offset: .51, transform: point(landX + 34, dropY, 50, .98) },
        { offset: .58, transform: point(landX + 40, dropY - 12, 60) },
        { offset: .63, transform: point(landX + 46, dropY, 70) },
        { offset: .82, transform: point(endX - 32, dropY, degrees) },
        { offset: .94, transform: point(endX, endY + 5, degrees + 20, .94) },
        { offset: 1, transform: point(endX, endY, degrees + 20), opacity: 1 }
      ];
      animation = overlay.animate(frames, {
        duration: ANIMATION_MS,
        easing: 'linear',
        fill: 'forwards'
      });
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
