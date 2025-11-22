import { LuxFadeIn } from '../ui/LuxFadeIn';

export default function HeroSection() {
  return (
    <section id="home" className="lux-section bg-transparent relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-transparent" />

      <div className="relative z-10 min-h-screen flex items-center">
        <div className="lux-content max-w-7xl mx-auto px-6 md:px-10 lg:px-16 w-full pt-28 md:pt-32">
          <div className="text-center md:text-left max-w-4xl">
            <LuxFadeIn delay={0.05}>
              <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-300 mb-6">
                DALLAS · FORT WORTH · NORTH TEXAS
              </p>
            </LuxFadeIn>

            <LuxFadeIn delay={0.1}>
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]">
                <span className="block text-white">CURATING EXCEPTIONAL</span>
                <span className="block text-[#F5E6C8]">LUXURY REAL ESTATE</span>
                <span className="block text-white">FOR DISCERNING BUYERS & SELLERS</span>
              </h1>
            </LuxFadeIn>

            <LuxFadeIn delay={0.15}>
              <p className="text-neutral-300 text-base md:text-lg leading-relaxed max-w-2xl mb-10">
                Missy Dours is more than a realtor. She is a trusted advisor, blending market expertise, discretion, and concierge-level guidance to protect and elevate your most important investment.
              </p>
            </LuxFadeIn>

            <LuxFadeIn delay={0.25}>
              <div className="flex flex-col sm:flex-row gap-4 items-center md:items-start">
                <a
                  href="#contact"
                  className="inline-block bg-[#C4A46A] text-black font-medium px-7 py-3 rounded-full shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] transition-all"
                >
                  Schedule a Consultation
                </a>
                <a
                  href="#communities"
                  className="inline-block border-2 border-[#C4A46A] text-white hover:bg-gradient-to-br hover:from-[#8B6F47]/40 hover:to-[#6B5335]/30 rounded-full px-7 py-3 shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] transition-all duration-300"
                >
                  Explore Communities
                </a>
              </div>
            </LuxFadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
