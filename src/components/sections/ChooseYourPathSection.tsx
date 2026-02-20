import { LuxFadeIn } from "../ui/LuxFadeIn";
import { ArrowRight, ArrowDown, CheckCircle2, Crown, TrendingUp, Heart } from "lucide-react";

interface ChooseYourPathSectionProps {
  selectedPath: "luxury" | "mid-tier" | "first-time" | null;
  onSelectPath: (path: "luxury" | "mid-tier" | "first-time") => void;
}

const pathOptions = [
  {
    id: "luxury" as const,
    title: "Luxury Homes",
    icon: Crown,
    subtext: "High-end residences with elevated finishes, prime locations, and a curated, white-glove experience.",
    image: "/images/luxury-home.webp",
  },
  {
    id: "mid-tier" as const,
    title: "Mid-Tier Move-Up Homes",
    icon: TrendingUp,
    subtext: "Smart upgrades for buyers ready to move beyond their first home into more comfort and space.",
    image: "/images/midmarket-home.webp",
  },
  {
    id: "first-time" as const,
    title: "First-Time Buyer Homes",
    icon: Heart,
    subtext: "Approachable, well-positioned homes that make your first purchase feel clear, supported, and achievable.",
    image: "/images/firsttime-home.webp",
  },
];

export default function ChooseYourPathSection({
  selectedPath,
  onSelectPath,
}: ChooseYourPathSectionProps) {
  return (
    <section
      id="choose-your-path"
      className="lux-section relative bg-transparent text-white pt-24 md:pt-32 lg:pt-36 pb-12 md:pb-16"
    >
      {/* Gold Radial Glow - Extended with smooth fadeout */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          background: 'radial-gradient(ellipse 150% 120% at center 40%, rgba(196, 164, 106, 0.45) 0%, rgba(196, 164, 106, 0.35) 15%, rgba(196, 164, 106, 0.22) 30%, rgba(196, 164, 106, 0.12) 45%, rgba(196, 164, 106, 0.05) 60%, rgba(196, 164, 106, 0.02) 75%, rgba(196, 164, 106, 0) 90%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 md:px-10 lg:px-16 space-y-10">
        <LuxFadeIn delay={0.05}>
          <div className="flex flex-col items-center text-center gap-4 mb-8">
            <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-300">
              Find Your Home Path
            </p>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
              Choose the Experience <span className="text-[#F5E6C8]">That Fits You</span>
            </h2>
          </div>
        </LuxFadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {pathOptions.map((option, index) => {
            const isSelected = selectedPath === option.id;
            return (
              <LuxFadeIn key={option.id} delay={0.1 + index * 0.08}>
                <button
                  type="button"
                  onClick={() => onSelectPath(option.id)}
                  className={`group relative flex flex-col rounded-2xl overflow-hidden bg-black/55 border-2 backdrop-blur-md transition-all duration-300 w-full text-left ${
                    isSelected
                      ? "border-[#F5E6C8] shadow-[0_0_35px_rgba(245,230,200,0.8)] ring-2 ring-[#F5E6C8]/50"
                      : "border-[#C4A46A] shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)]"
                  } hover:scale-[1.01] hover:-translate-y-[2px]`}
                >
                  {/* Selected Banner - Positioned at Top */}
                  {isSelected && (
                    <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-gradient-to-r from-[#C4A46A] to-[#F5E6C8] text-black px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Selected
                    </div>
                  )}

                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={option.image}
                      alt={option.title}
                      className="w-full h-full object-cover object-center transform group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20" />
                  </div>

                  <div className={`flex flex-col gap-3 px-5 pt-5 pb-6 min-h-[200px] transition-all duration-300 ${
                    isSelected
                      ? "bg-gradient-to-br from-[#8B6F47]/50 to-[#6B5335]/40"
                      : "bg-black/40 group-hover:bg-gradient-to-br group-hover:from-[#8B6F47]/40 group-hover:to-[#6B5335]/30"
                  }`}>
                    <div className="flex items-center gap-3">
                      <option.icon className="w-5 h-5 md:w-6 md:h-6 text-[#D4AF37] group-hover:scale-110 transition-transform duration-300" />
                      <h3 className="text-lg md:text-xl font-semibold leading-snug">
                        {option.title}
                      </h3>
                    </div>
                    <p className="text-sm text-neutral-200 leading-relaxed flex-grow">
                      {option.subtext}
                    </p>
                    <div className="pt-2 mt-auto">
                      {isSelected ? (
                        <div className="flex items-center gap-1.5 bg-gradient-to-r from-[#C4A46A] to-[#F5E6C8] text-black px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg w-fit">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Selected
                          <ArrowDown className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-white/90 group-hover:text-[#F5E6C8] transition-all duration-300">
                          Explore Path
                          <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </LuxFadeIn>
            );
          })}
        </div>

        {/* Footer Logo */}
        <LuxFadeIn delay={0.4}>
          <div className="flex justify-center mt-6">
            <img
              src="/images/md-logo.png"
              alt="Missy Duvall Logo"
              className="h-16 md:h-20 w-auto opacity-90"
            />
          </div>
        </LuxFadeIn>
      </div>
    </section>
  );
}
