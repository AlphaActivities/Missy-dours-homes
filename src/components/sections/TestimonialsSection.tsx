import { useCallback, useEffect, useRef, useState } from "react";
import { LuxFadeIn } from "../ui/LuxFadeIn";
import { Star, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import { trackCTA } from "../../utils/analytics";
import { CONTACT_INFO } from "../../config/contact";
import { supabase } from "../../lib/supabase";
import { formatDateShort } from "../../utils/formatDate";

interface GoogleReview {
  id: string;
  google_review_id: string;
  reviewer_name: string | null;
  reviewer_profile_photo_url: string | null;
  star_rating: number | null;
  comment: string | null;
  review_created_at: string | null;
  review_updated_at: string | null;
  owner_reply: string | null;
  owner_reply_updated_at: string | null;
}

const FIRST_DELAY_MS = 2500;
const AUTOPLAY_MS = 7000;
const MANUAL_PAUSE_MS = 20000;
const MOBILE_CLAMP = 5;
const DESKTOP_CLAMP = 5;

const GOOGLE_COLORS = ['#4285F4', '#DB4437', '#F4B400', '#4285F4', '#0F9D58'];

export default function TestimonialsSection() {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [manualPauseActive, setManualPauseActive] = useState(false);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  const touchStartX = useRef<number | null>(null);
  const manualPauseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const hasTransitioned = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchReviews() {
      try {
        const { data, error } = await supabase
          .from("google_reviews")
          .select("id, google_review_id, reviewer_name, reviewer_profile_photo_url, star_rating, comment, review_created_at, review_updated_at, owner_reply, owner_reply_updated_at")
          .eq("is_displayable", true)
          .order("review_created_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          setFailed(true);
          setLoading(false);
          return;
        }

        setReviews(data || []);
        setLoading(false);
      } catch {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      }
    }

    fetchReviews();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasMultiple = reviews.length > 1;

  // Reduced motion check — stable across renders
  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // IntersectionObserver — detect when section is meaningfully visible
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
            setIsVisible(true);
          }
        });
      },
      { threshold: [0, 0.35, 0.5] }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Start or restart the 20-second manual pause
  const startManualPause = useCallback(() => {
    if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
    setManualPauseActive(true);
    manualPauseTimer.current = setTimeout(() => {
      setManualPauseActive(false);
      manualPauseTimer.current = null;
    }, MANUAL_PAUSE_MS);
  }, []);

  const goToReview = useCallback((index: number) => {
    setDirection(index > activeIndex ? 'forward' : 'backward');
    setActiveIndex(index);
    setIsExpanded(false);
    startManualPause();
  }, [activeIndex, startManualPause]);

  const goNext = useCallback(() => {
    setDirection('forward');
    setActiveIndex((prev) => (prev + 1) % reviews.length);
    setIsExpanded(false);
    startManualPause();
  }, [reviews.length, startManualPause]);

  const goPrev = useCallback(() => {
    setDirection('backward');
    setActiveIndex((prev) => (prev - 1 + reviews.length) % reviews.length);
    setIsExpanded(false);
    startManualPause();
  }, [reviews.length, startManualPause]);

  // Autoplay logic
  useEffect(() => {
    if (!hasMultiple || !isVisible || loading || failed) return;
    if (isExpanded) return; // Read More stops autoplay completely
    if (prefersReducedMotion) return; // Respect reduced motion
    if (isHovered || isFocused || manualPauseActive) return;

    const delay = hasTransitioned.current ? AUTOPLAY_MS : FIRST_DELAY_MS;
    const timer = setTimeout(() => {
      hasTransitioned.current = true;
      setDirection('forward');
      setActiveIndex((prev) => (prev + 1) % reviews.length);
      setIsExpanded(false);
    }, delay);

    return () => clearTimeout(timer);
  }, [activeIndex, hasMultiple, isVisible, isExpanded, isHovered, isFocused, manualPauseActive, loading, failed, prefersReducedMotion]);

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || !hasMultiple) return;
    const distance = touchStartX.current - e.changedTouches[0].clientX;
    if (distance > 60) goNext();
    else if (distance < -60) goPrev();
    touchStartX.current = null;
  };

  // Read More toggle — stops autoplay when expanded, resumes when collapsed
  const handleReadMoreToggle = () => {
    setIsExpanded((prev) => !prev);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (manualPauseTimer.current) clearTimeout(manualPauseTimer.current);
    };
  }, []);

  const currentReview = reviews[activeIndex];

  return (
    <section
      ref={sectionRef}
      id="testimonials"
      className="lux-section bg-transparent text-white pt-24 pb-20 md:pt-32 md:pb-28 lg:pt-40 lg:pb-28"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 space-y-10">

        {/* HEADER */}
        <LuxFadeIn delay={0.05}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-200">
                Client Stories
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                What <span className="text-[#F5E6C8]">Clients Say</span>
              </h2>
            </div>
            <p className="max-w-xl text-sm md:text-base text-neutral-200/90">
              A consistent thread across every transaction: clarity, discretion,
              and follow-through. These are a few of the experiences shared by
              clients who trusted Missy with their move.
            </p>
          </div>
        </LuxFadeIn>

        {/* CAROUSEL — only render when not loading and reviews exist */}
        {!loading && reviews.length > 0 && currentReview && (
          <div className="flex flex-col items-center gap-6">
            <div
              className="relative w-full max-w-2xl mx-auto"
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              {/* DESKTOP ARROW CONTROLS */}
              {hasMultiple && (
                <>
                  <button
                    onClick={goPrev}
                    aria-label="Previous review"
                    className="hidden md:flex absolute left-[-52px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full border border-[#c29f63]/30 bg-white/[0.04] backdrop-blur-md text-[#F5E6C8]/70 hover:text-[#F5E6C8] hover:border-[#c29f63]/60 hover:bg-white/[0.08] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/60"
                  >
                    <ChevronLeft size={20} strokeWidth={1.5} />
                  </button>
                  <button
                    onClick={goNext}
                    aria-label="Next review"
                    className="hidden md:flex absolute right-[-52px] top-1/2 -translate-y-1/2 z-10 w-10 h-10 items-center justify-center rounded-full border border-[#c29f63]/30 bg-white/[0.04] backdrop-blur-md text-[#F5E6C8]/70 hover:text-[#F5E6C8] hover:border-[#c29f63]/60 hover:bg-white/[0.08] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/60"
                  >
                    <ChevronRight size={20} strokeWidth={1.5} />
                  </button>
                </>
              )}

              {/* REVIEW CARD */}
              <div
                key={activeIndex}
                className={`living-gold-border rounded-2xl bg-gradient-to-br from-[#8B6F47]/90 via-[#7A5F3C]/90 to-[#6B5335]/90 border-2 border-[#C4A46A]/50 backdrop-blur-2xl px-6 py-7 sm:px-8 sm:py-8 shadow-[0_18px_45px_rgba(0,0,0,0.7),0_0_30px_rgba(196,164,106,0.22)] hover:shadow-[0_18px_45px_rgba(0,0,0,0.7),0_0_44px_rgba(196,164,106,0.35)] transition-shadow duration-500 ${direction === 'forward' ? 'motion-safe:animate-review-fade-in' : 'motion-safe:animate-review-fade-in-reverse'} flex flex-col`}
              >
                {/* STAR RATING + GOOGLE ATTRIBUTION */}
                <div className="flex items-center justify-between mb-5">
                  {currentReview.star_rating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, star) => (
                        <Star
                          key={star}
                          size={16}
                          fill={star < currentReview.star_rating! ? "#F5E6C8" : "none"}
                          stroke="#F5E6C8"
                          strokeWidth={1.5}
                        />
                      ))}
                    </div>
                  )}
                  {/* GOOGLE REVIEW ATTRIBUTION — premium treatment */}
                  <div className="flex items-center gap-1.5 motion-safe:animate-review-attrib-in">
                    <div className="flex items-center gap-[1px]">
                      {GOOGLE_COLORS.map((color, i) => (
                        <span
                          key={i}
                          className="inline-block w-[3px] h-[10px] rounded-[1px]"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <span className="text-[0.65rem] tracking-[0.15em] uppercase text-[#F5E6C8]/70 font-medium">
                      Google Review
                    </span>
                  </div>
                </div>

                {/* REVIEW COMMENT with Read More + OWNER REPLY (expanded only) */}
                <div className="flex-1">
                  {currentReview.comment && (
                    <ReviewText
                      text={currentReview.comment}
                      isExpanded={isExpanded}
                      onToggle={handleReadMoreToggle}
                    />
                  )}

                  {/* OWNER REPLY — hidden when collapsed, shown when expanded */}
                  {isExpanded && currentReview.owner_reply && (
                    <div className="mt-5 pl-4 border-l-2 border-[#F5E6C8]/30 motion-safe:animate-review-fade-in">
                      <p className="text-[0.7rem] tracking-[0.12em] uppercase text-[#F5E6C8]/70 mb-1.5">
                        Response from Missy
                      </p>
                      <p className="text-xs md:text-[13px] leading-relaxed text-neutral-200/80">
                        {currentReview.owner_reply}
                      </p>
                    </div>
                  )}
                </div>

                {/* REVIEWER INFO */}
                <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-3">
                  {currentReview.reviewer_profile_photo_url ? (
                    <img
                      src={currentReview.reviewer_profile_photo_url}
                      alt={currentReview.reviewer_name || "Reviewer"}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#F5E6C8]/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-semibold text-[#F5E6C8]">
                        {(currentReview.reviewer_name || "?").charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-white truncate">
                      {currentReview.reviewer_name || "Anonymous"}
                    </span>
                    {currentReview.review_created_at && (
                      <span className="text-xs text-neutral-200">
                        {formatDateShort(currentReview.review_created_at)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* MOBILE ARROWS + PAGINATION DOTS */}
              {hasMultiple && (
                <div className="flex items-center justify-center gap-4 mt-5">
                  <button
                    onClick={goPrev}
                    aria-label="Previous review"
                    className="md:hidden flex w-9 h-9 items-center justify-center rounded-full border border-[#c29f63]/30 bg-white/[0.04] backdrop-blur-md text-[#F5E6C8]/70 hover:text-[#F5E6C8] hover:border-[#c29f63]/60 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/60"
                  >
                    <ChevronLeft size={18} strokeWidth={1.5} />
                  </button>

                  {/* DOTS */}
                  <div className="flex items-center gap-2" role="tablist" aria-label="Review navigation">
                    {reviews.map((review, index) => (
                      <button
                        key={review.id}
                        onClick={() => goToReview(index)}
                        role="tab"
                        aria-selected={index === activeIndex}
                        aria-label={`Go to review ${index + 1}`}
                        className={`transition-all duration-300 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/60 ${
                          index === activeIndex
                            ? 'w-6 h-[6px] bg-[#F5E6C8]'
                            : 'w-[6px] h-[6px] bg-white/25 hover:bg-white/40'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={goNext}
                    aria-label="Next review"
                    className="md:hidden flex w-9 h-9 items-center justify-center rounded-full border border-[#c29f63]/30 bg-white/[0.04] backdrop-blur-md text-[#F5E6C8]/70 hover:text-[#F5E6C8] hover:border-[#c29f63]/60 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/60"
                  >
                    <ChevronRight size={18} strokeWidth={1.5} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && (
          <div className="max-w-2xl mx-auto">
            <div
              className="rounded-2xl bg-gradient-to-br from-[#8B6F47]/40 via-[#7A5F3C]/40 to-[#6B5335]/40 border border-[#c29f63]/15 backdrop-blur-2xl px-6 py-7 animate-pulse"
              style={{ minHeight: "320px" }}
            />
          </div>
        )}

        {/* GOOGLE REVIEW CTA */}
        <LuxFadeIn delay={0.25}>
          <div className="max-w-2xl mx-auto mt-6">
            <div className="rounded-2xl border-2 border-[#C4A46A]/60 bg-gradient-to-br from-[#2a1f17]/85 via-[#1f1812]/80 to-[#15110d]/75 backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7 shadow-[0_12px_35px_rgba(0,0,0,0.5),0_0_20px_rgba(196,164,106,0.15)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(196,164,106,0.25)] transition-shadow duration-300 ring-1 ring-inset ring-white/10">
              <div className="flex flex-col items-center text-center gap-4 sm:gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-1.5 drop-shadow-[0_0_6px_rgba(245,230,200,0.35)]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={15} fill="#F5E6C8" stroke="#F5E6C8" strokeWidth={1.5} />
                    ))}
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-[#F5E6C8] tracking-wide">
                    Share Your Experience
                  </h3>
                  <p className="text-xs tracking-[0.2em] uppercase text-[#F5E6C8]/70">Review on Google</p>
                </div>
                <p className="text-sm sm:text-[0.95rem] leading-relaxed text-neutral-200/90 max-w-md">
                  Worked with Missy? Share your experience on Google and help future buyers and sellers feel confident about their next move.
                </p>
                <a
                  href={CONTACT_INFO.googleReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackCTA('Leave Missy a Google Review', 'testimonials')}
                  className="group relative inline-flex items-center gap-1.5 sm:gap-2 rounded-full bg-gradient-to-r from-[#f5e3b6] via-[#e7c78a] to-[#c89c4f] px-5 sm:px-8 py-3 text-[0.7rem] sm:text-[0.82rem] font-semibold tracking-[0.14em] sm:tracking-[0.18em] uppercase text-[#1b1b1b] whitespace-nowrap shadow-[0_14px_40px_rgba(0,0,0,0.55)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(0,0,0,0.7),0_0_28px_rgba(245,230,200,0.35)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/80 active:translate-y-px ring-1 ring-[#f5e3b6]/25"
                >
                  <Star size={13} sm:size={15} fill="#1b1b1b" stroke="#1b1b1b" strokeWidth={1.5} />
                  <span>Review Missy on Google</span>
                </a>
              </div>
            </div>
          </div>
        </LuxFadeIn>
      </div>
    </section>
  );
}

/* ---------- Progressive word-by-word reveal hook ---------- */

const REVEAL_DELAY_MS = 280;
const REVEAL_TOTAL_MS = 3600;

function useProgressiveReveal(text: string, enabled: boolean) {
  const [revealedCount, setRevealedCount] = useState(0);
  const wordsRef = useRef<string[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hasRevealedRef = useRef(false);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

   if (!enabled || prefersReducedMotion || hasRevealedRef.current) {
  setRevealedCount(text ? text.split(/\s+/).length : 0);

  if (!enabled || prefersReducedMotion) {
    hasRevealedRef.current = true;
  }

  return;
}

    const words = text ? text.split(/\s+/) : [];
    wordsRef.current = words;
    setRevealedCount(0);

    const wordCount = words.length;
    if (wordCount === 0) return;

    const interval = Math.max(110, Math.min(200, REVEAL_TOTAL_MS / wordCount));

    for (let i = 0; i < wordCount; i++) {
      const t = setTimeout(() => {
setRevealedCount(i + 1);
        
if (i === wordCount - 1) {
  hasRevealedRef.current = true;
}
      }, REVEAL_DELAY_MS + i * interval);
      timersRef.current.push(t);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, [text, enabled, prefersReducedMotion]);

const skip = useCallback(() => {
  timersRef.current.forEach(clearTimeout);
  timersRef.current = [];
  hasRevealedRef.current = true;
  setRevealedCount(wordsRef.current.length);
}, []);

  return { revealedCount, skip };
}

/* ---------- ReviewText with responsive Read More / Show Less ---------- */

function ReviewText({
  text,
  isExpanded,
  onToggle,
}: {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [needsTruncation, setNeedsTruncation] = useState(false);
  const fullRef = useRef<HTMLParagraphElement>(null);

  const { revealedCount, skip } = useProgressiveReveal(text, !isExpanded);

  const prefersReducedMotion = typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // When expanded or Read More clicked mid-reveal, show full text immediately
  useEffect(() => {
    if (isExpanded) {
      skip();
    }
  }, [isExpanded, skip]);

  useEffect(() => {
    const el = fullRef.current;
    if (!el) return;

    const measure = () => {
      const lineHeight = parseFloat(getComputedStyle(el).lineHeight) || 24;
      const isDesktop = window.innerWidth >= 768;
      const clampLines = isDesktop ? DESKTOP_CLAMP : MOBILE_CLAMP;
      const threshold = lineHeight * clampLines;
      setNeedsTruncation(el.scrollHeight > threshold + 4);
    };

    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [text]);

  const words = text ? text.split(/\s+/) : [];
  const isFullyRevealed = isExpanded || revealedCount >= words.length || prefersReducedMotion;

  return (
    <div className="flex flex-col">
      {/* Text area — reserved min-height when collapsed for equal card heights */}
      <div className={isExpanded ? '' : 'min-h-[120px] md:h-[122px]'}>
        {/* Screen-reader text — always complete, never staggered */}
        <p className="sr-only">{text}</p>

        <p
          ref={fullRef}
          aria-hidden="true"
          className={`text-sm md:text-[15px] leading-relaxed text-white ${
            !isExpanded && needsTruncation
              ? 'line-clamp-5 md:line-clamp-5'
              : ''
          }`}
        >
          {isFullyRevealed ? (
            text
          ) : (
            <>
              {words.slice(0, revealedCount).map((word, i) => (
                <span
                  key={i}
                  className="inline animate-word-reveal"
                >
                  {word}{' '}
                </span>
              ))}
              {revealedCount < words.length && (
                <span className="invisible">
                  {words.slice(revealedCount).join(' ')}
                </span>
              )}
            </>
          )}
        </p>
      </div>

      {/* Read More slot — always reserved to prevent footer shift */}
      <div className={isExpanded ? 'mt-3' : 'min-h-[28px] mt-3 md:h-[32px] md:min-h-[32px]'}>
        {needsTruncation && (
          <button
            onClick={onToggle}
            aria-expanded={isExpanded}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#c29f63]/40 bg-[#c29f63]/10 px-3.5 py-1.5 text-[0.7rem] tracking-[0.12em] uppercase text-[#F5E6C8] font-medium hover:bg-[#c29f63]/20 hover:border-[#c29f63]/70 hover:-translate-y-0.5 hover:brightness-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/70 active:translate-y-0"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp size={12} strokeWidth={2} />
              </>
            ) : (
              <>
                <span>Read More</span>
                <ChevronDown size={12} strokeWidth={2} />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
