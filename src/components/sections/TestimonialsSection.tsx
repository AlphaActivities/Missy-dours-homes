import { LuxFadeIn } from "../ui/LuxFadeIn";
import { Star } from 'lucide-react';

const testimonials = [
  {
    id: 1,
    name: "Landon Haas",
    detail: "First-Time Homebuyer",
    quote:
      "Missy made my first-time home-buying experience seamless. She took the time to understand what I wanted and what fit my style and personality. My favorite part about working with Missy was her hands-on and proactive approach. She visited all types of properties before narrowing down the best one for me.",
  },
  {
    id: 2,
    name: "",
    detail: "",
    quote: "",
  },
  {
    id: 3,
    name: "",
    detail: "",
    quote: "",
  },
];

export default function TestimonialsSection() {
  return (
    <section
      id="testimonials"
      className="lux-section bg-transparent text-white py-24 md:py-32 lg:py-40"
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

        {/* TESTIMONIAL GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <LuxFadeIn key={testimonial.id} delay={0.1 + index * 0.08}>
              <article className="group relative h-full rounded-2xl bg-gradient-to-br from-[#8B6F47]/90 via-[#7A5F3C]/90 to-[#6B5335]/90 border border-[#c29f63]/30 backdrop-blur-2xl px-6 py-7 flex flex-col justify-between shadow-[0_18px_45px_rgba(0,0,0,0.7)]">

                {/* QUOTE CONTENT */}
                <div>
                  <div className="flex items-center gap-1 mb-4">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={16} fill="#F5E6C8" stroke="#F5E6C8" strokeWidth={1.5} />
                    ))}
                  </div>
                  {testimonial.quote && (
                    <p className="text-sm md:text-[15px] leading-relaxed text-white">
                      {testimonial.quote}
                    </p>
                  )}
                </div>

                {/* CLIENT INFO */}
                {testimonial.name && (
                  <div className="mt-6 pt-4 border-t border-white/20 flex flex-col">
                    <span className="text-sm font-semibold text-white">
                      {testimonial.name}
                    </span>
                    {testimonial.detail && (
                      <span className="text-xs text-neutral-200">
                        {testimonial.detail}
                      </span>
                    )}
                  </div>
                )}
              </article>
            </LuxFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
