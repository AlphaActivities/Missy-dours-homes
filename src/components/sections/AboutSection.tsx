import { useState, useEffect } from "react";
import { LuxFadeIn } from "../ui/LuxFadeIn";
import { scrollToSection } from "../../utils/scrollToSection";

export default function AboutSection() {
  const [currentImage, setCurrentImage] = useState(0);
  const images = ["/images/pfp1.jpg", "/images/pfp2.jpg"];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % images.length);
    }, 8000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section
      id="about"
      className="bg-[#f7f3ea] py-20 md:py-28 lg:py-32"
    >
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="grid gap-12 lg:gap-16 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] items-start">

          {/* LEFT — PORTRAIT CARD */}
          <LuxFadeIn delay={0.1}>
            <div className="relative rounded-[2rem] overflow-hidden bg-gradient-to-b from-black/45 via-black/20 to-black/5 border border-white/40 shadow-[0_28px_80px_rgba(15,23,42,0.6)] backdrop-blur-xl h-[400px] md:h-[480px] lg:h-[520px]">
              {images.map((img, index) => (
                <img
                  key={img}
                  src={img}
                  alt="Missy Dours Portrait"
                  className={`w-full h-full object-cover absolute inset-0 transition-opacity duration-1000 ${
                    index === currentImage ? "opacity-100" : "opacity-0"
                  }`}
                />
              ))}

              {/* GOLD GLOW RING */}
              <div className="pointer-events-none absolute inset-x-10 -bottom-16 h-24 rounded-full bg-gradient-to-r from-[#f3d7a0]/70 via-[#f9e9c6]/40 to-[#c79b4b]/70 blur-2xl opacity-70"></div>

              {/* CAPTION STRIP */}
              <div className="absolute left-6 bottom-6 rounded-full bg-black/65 px-4 py-1.5 text-[0.72rem] tracking-[0.18em] uppercase text-white/85 flex flex-wrap gap-x-2 gap-y-1">
                <span>Missy Dours</span>
                <span className="text-white/60">·</span>
                <span>Dallas–Fort Worth Luxury Real Estate</span>
              </div>
            </div>
          </LuxFadeIn>

          {/* RIGHT — TEXT CONTENT */}
          <LuxFadeIn delay={0.2}>
            <div className="flex flex-col justify-center gap-6 lg:gap-7 text-center lg:text-left">

              {/* GOLD ACCENT RULE */}
              <div className="h-[1px] w-32 sm:w-40 lg:w-48 bg-gradient-to-r from-[#f3d7a0] via-[#f9e9c6] to-transparent mb-2 mx-auto lg:mx-0"></div>

              {/* HEADING */}
              <h2 className="text-3xl sm:text-4xl lg:text-[2.6rem] font-semibold tracking-tight text-[#111111]">
                Meet{' '}
                <span className="block text-[2.6rem] sm:text-[2.8rem] lg:text-[3rem] font-semibold text-[#f1d598]">
                  Missy Dours
                </span>
              </h2>

              {/* SUBHEADLINE */}
              <p className="text-sm sm:text-base tracking-[0.18em] uppercase text-[#9b8b6a] mt-1">
                Dallas – Fort Worth Luxury Real Estate Specialist
              </p>

              {/* BIO COPY */}
              <div className="text-[0.95rem] sm:text-base leading-relaxed text-[#3b3b3b]/90 space-y-4 max-w-xl mx-auto lg:mx-0">
                <p>
                  Missy brings a refined, client-first approach to the Dallas–Fort Worth luxury market.
                  With an eye for detail and a reputation for exceptional service, her mission is to
                  deliver a seamless, concierge-level real estate experience for buyers and sellers alike.
                </p>
                <p>
                  Known for her integrity, transparency, and elevated marketing strategy, Missy guides
                  clients through every stage of their real estate journey with confidence and clarity.
                  Whether showcasing premium properties or negotiating high-value deals, she is committed
                  to results that exceed expectations.
                </p>
              </div>

              {/* CTA BUTTON */}
              <div className="mt-4 sm:mt-6">
                <div className="flex flex-wrap gap-3 sm:gap-4 justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => scrollToSection('contact')}
                    className="group relative inline-flex items-center justify-center rounded-full bg-[#111111] px-7 sm:px-9 py-3 text-sm sm:text-[0.95rem] font-medium tracking-[0.16em] uppercase text-white shadow-[0_18px_45px_rgba(15,23,42,0.55)] transition-all duration-300 hover:shadow-[0_24px_60px_rgba(15,23,42,0.7)] hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f1d598]"
                  >
                    <span className="relative inline-block">
                      Schedule a Private Consultation
                      <span
                        className="pointer-events-none absolute -left-2 -bottom-1 h-[2px] w-[calc(100%+1rem)] origin-left scale-x-0 bg-gradient-to-r from-[#e2c88d] via-[#f6e6bf] to-[#c79c4d] transition-transform duration-300 group-hover:scale-x-100"
                      />
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </LuxFadeIn>

        </div>
      </div>
    </section>
  );
}
