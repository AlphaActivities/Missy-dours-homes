import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export const ROYAL_GRAVITY_SEEN_KEY = 'missy_royal_gravity_entrance_v4';
const MIN_HOME_MS = 6000;
const AFTER_HERO_MS = 4000;
const ANIMATION_MS = 3400;

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
      const baseRotation = revolutions * 360;

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

      // Three progressively smaller bounces, then a measured roll and final drop.
      // Sample a damped, gravity-driven path. Each rebound has a parabolic arc
      // and a shorter flight time (restitution ~= 0.56), rather than evenly
      // spaced hand-drawn keyframes that appear to float.
      const frames: Keyframe[] = [];
      const sample = (time: number, x: number, y: number, rotation: number, sx = 1, sy = 1) => {
        frames.push({
          offset: Math.min(1, time / ANIMATION_MS),
          transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${rotation.toFixed(2)}deg) scale(${sx.toFixed(3)},${sy.toFixed(3)})`,
          opacity: 1
        });
      };
      const startY = -destination.height * 1.4;
      const dropDuration = 630;
      const flightDurations = [520, 300, 170];
      const reboundHeights = [72, 23, 7].map(height => Math.min(height, Math.max(4, dropY * .38)));
      const bounceEnd = dropDuration + flightDurations.reduce((sum, duration) => sum + duration, 0);
      const rollEnd = ANIMATION_MS;
      const contactX = landX;
      const cardRightX = surface ? Math.max(contactX + 36, surface.right - destination.width * .90) : Math.max(endX, window.innerWidth - destination.width - 14);
      const edgeX = Math.max(contactX + 36, Math.min(cardRightX, Math.max(endX, contactX + 36)));
      const bounceTravel = Math.max(12, (edgeX - contactX) * .18);
      const rollStartX = contactX + bounceTravel;
      const rollTravel = Math.max(0, edgeX - rollStartX);
      // Reserve a short final hop. Most post-bounce time is genuine horizontal rolling.
      const rollFinishTime = bounceEnd + (rollEnd - bounceEnd) * .79;
      const edgeTurns = Math.max(1, Math.ceil((rollTravel + destination.width * .5) / (Math.PI * destination.width)));
      const edgeRotation = edgeTurns * 360;
      const finalRotation = Math.max(baseRotation, edgeRotation + 360);
      const step = 1000 / 60;
      // Use exactly one contact plane: the bottom of the ball is aligned with
      // the measured card top at each impact.
      for (let t = 0; t <= ANIMATION_MS; t += step) {
        const time = Math.min(t, ANIMATION_MS);
        let x: number;
        let y: number;
        let rotation: number;
        let sx = 1;
        let sy = 1;
        if (time <= dropDuration) {
          const u = time / dropDuration;
          x = startX + (contactX - startX) * u;
          y = startY + (dropY - startY) * u * u;
          rotation = -25 * (1 - u);
        } else if (time <= bounceEnd) {
          let remaining = time - dropDuration;
          let index = 0;
          while (index < flightDurations.length - 1 && remaining > flightDurations[index]) {
            remaining -= flightDurations[index];
            index++;
          }
          const u = Math.min(1, remaining / flightDurations[index]);
          const arc = 4 * u * (1 - u);
          y = dropY - reboundHeights[index] * arc;
          const elapsed = (time - dropDuration) / (bounceEnd - dropDuration);
          x = contactX + bounceTravel * elapsed;
          rotation = 70 * elapsed;
          // Subtle contact deformation, limited to the first few milliseconds.
          const contact = Math.min(u, 1 - u);
          const squash = Math.max(0, 1 - contact / .075) * (.075 / (index + 1));
          sx = 1 + squash;
          sy = 1 - squash;
        } else if (time <= rollFinishTime) {
          const u = Math.min(1, (time - bounceEnd) / (rollFinishTime - bounceEnd));
          // Keep horizontal speed visible across the card. Decelerate only
          // near the right edge, never while still halfway across the surface.
          const progress = 1 - Math.pow(1 - u, 1.35);
          x = rollStartX + rollTravel * progress;
          y = dropY;
          rotation = 70 + (edgeRotation - 70) * progress;
        } else {
          const u = Math.min(1, (time - rollFinishTime) / (rollEnd - rollFinishTime));
          // Launch a short, visible hop from the surface to the fixed control.
          // Parabolic arc ends at the exact destination without any zoom/scale.
          const horizontal = u * u * (3 - 2 * u);
          const hopHeight = Math.min(90, Math.max(34, destination.height * .85));
          x = edgeX + (endX - edgeX) * horizontal;
          y = dropY + (endY - dropY) * u - 4 * hopHeight * u * (1 - u);
          // A whole forward revolution finishes level; no snap or reverse flip.
          rotation = edgeRotation + (finalRotation - edgeRotation) * horizontal;
        }
        sample(time, x, y, rotation, sx, sy);
      }
      sample(ANIMATION_MS, endX, endY, finalRotation);
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
