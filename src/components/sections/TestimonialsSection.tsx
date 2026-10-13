import { useEffect, useState } from "react";
import { LuxFadeIn } from "../ui/LuxFadeIn";
import { Star } from 'lucide-react';
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

export default function TestimonialsSection() {
  const [reviews, setReviews] = useState<GoogleReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

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

  return (
    <section
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

        {/* REVIEW GRID — only render when not loading and reviews exist */}
        {!loading && reviews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 md:gap-8">
            {reviews.map((review, index) => (
              <LuxFadeIn key={review.id} delay={0.1 + index * 0.08}>
                <article className="group relative h-full rounded-2xl bg-gradient-to-br from-[#8B6F47]/90 via-[#7A5F3C]/90 to-[#6B5335]/90 border border-[#c29f63]/30 backdrop-blur-2xl px-6 py-7 flex flex-col justify-between shadow-[0_18px_45px_rgba(0,0,0,0.7)] select-none">

                  {/* QUOTE CONTENT */}
                  <div>
                    {/* STAR RATING + GOOGLE ATTRIBUTION */}
                    <div className="flex items-center justify-between mb-4">
                      {review.star_rating && (
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }).map((_, star) => (
                            <Star
                              key={star}
                              size={16}
                              fill={star < review.star_rating! ? "#F5E6C8" : "none"}
                              stroke="#F5E6C8"
                              strokeWidth={1.5}
                            />
                          ))}
                        </div>
                      )}
                      <span className="text-[0.65rem] tracking-[0.15em] uppercase text-[#F5E6C8]/60">
                        Google Review
                      </span>
                    </div>

                    {/* REVIEW COMMENT */}
                    {review.comment && (
                      <p className="text-sm md:text-[15px] leading-relaxed text-white">
                        {review.comment}
                      </p>
                    )}

                    {/* OWNER REPLY */}
                    {review.owner_reply && (
                      <div className="mt-4 pl-4 border-l-2 border-[#F5E6C8]/30">
                        <p className="text-[0.7rem] tracking-[0.12em] uppercase text-[#F5E6C8]/70 mb-1.5">
                          Response from Missy
                        </p>
                        <p className="text-xs md:text-[13px] leading-relaxed text-neutral-200/80">
                          {review.owner_reply}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* REVIEWER INFO */}
                  <div className="mt-6 pt-4 border-t border-white/20 flex items-center gap-3">
                    {review.reviewer_profile_photo_url ? (
                      <img
                        src={review.reviewer_profile_photo_url}
                        alt={review.reviewer_name || "Reviewer"}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#F5E6C8]/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-semibold text-[#F5E6C8]">
                          {(review.reviewer_name || "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold text-white truncate">
                        {review.reviewer_name || "Anonymous"}
                      </span>
                      {review.review_created_at && (
                        <span className="text-xs text-neutral-200">
                          {formatDateShort(review.review_created_at)}
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              </LuxFadeIn>
            ))}
          </div>
        )}

        {/* LOADING SKELETON */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-6 md:gap-8">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="rounded-2xl bg-gradient-to-br from-[#8B6F47]/40 via-[#7A5F3C]/40 to-[#6B5335]/40 border border-[#c29f63]/15 backdrop-blur-2xl px-6 py-7 animate-pulse"
                style={{ minHeight: "200px" }}
              />
            ))}
          </div>
        )}

        {/* GOOGLE REVIEW CTA */}
        <LuxFadeIn delay={0.25}>
          <div className="max-w-2xl mx-auto mt-6">
            <div className="rounded-2xl border border-[#c29f63]/60 bg-gradient-to-br from-white/[0.06] via-white/[0.03] to-transparent backdrop-blur-xl px-6 py-6 sm:px-8 sm:py-7 shadow-[0_12px_35px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_34px_rgba(196,164,106,0.32)] transition-shadow duration-300 ring-1 ring-inset ring-white/10">
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
                  className="group relative inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f5e3b6] via-[#e7c78a] to-[#c89c4f] px-7 sm:px-8 py-3 text-[0.78rem] sm:text-[0.82rem] font-semibold tracking-[0.18em] uppercase text-[#1b1b1b] shadow-[0_14px_40px_rgba(0,0,0,0.55)] hover:brightness-110 hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(0,0,0,0.7),0_0_28px_rgba(245,230,200,0.35)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e3b6]/80 active:translate-y-px ring-1 ring-[#f5e3b6]/25"
                >
                  <Star size={15} fill="#1b1b1b" stroke="#1b1b1b" strokeWidth={1.5} />
                  <span>Leave Missy a Google Review</span>
                </a>
              </div>
            </div>
          </div>
        </LuxFadeIn>
      </div>
    </section>
  );
}
