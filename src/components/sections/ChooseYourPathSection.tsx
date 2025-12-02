import { LuxFadeIn } from "../ui/LuxFadeIn";

interface ChooseYourPathSectionProps {
  selectedPath: "luxury" | "mid-tier" | "first-time" | null;
  onSelectPath: (path: "luxury" | "mid-tier" | "first-time") => void;
}

const pathOptions = [
  {
    id: "luxury" as const,
    title: "Luxury Homes",
    subtext: "High-end residences with elevated finishes, prime locations, and a curated, white-glove experience.",
    image: "/images/luxury-home.webp",
  },
  {
    id: "mid-tier" as const,
    title: "Mid-Tier Move-Up Homes",
    subtext: "Smart upgrades for buyers ready to move beyond their first home into more comfort and space.",
    image: "/images/midmarket-home.webp",
  },
  {
    id: "first-time" as const,
    title: "First-Time Buyer Friendly Homes",
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
      className="lux-section relative bg-transparent text-white py-24 md:py-32 lg:py-36"
    >
      {/* Gold Radial Glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(196, 164, 106, 0.5) 0%, rgba(196, 164, 106, 0.25) 25%, rgba(196, 164, 106, 0) 50%)',
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
                  className={`group relative flex flex-col rounded-2xl overflow-hidden bg-black/55 border-2 backdrop-blur-md transition-all duration-300 w-full text-left hover:scale-[1.01] hover:-translate-y-[2px] ${
                    isSelected
                      ? "border-[#F5E6C8] shadow-[0_0_35px_rgba(245,230,200,0.8)] ring-2 ring-[#F5E6C8]/50"
                      : "border-[#C4A46A] shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)]"
                  }`}
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={option.image}
                      alt={option.title}
                      className="w-full h-full object-cover object-center transform group-hover:scale-[1.03] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20" />
                  </div>

                  <div className={`flex flex-col gap-3 px-5 pt-5 pb-6 transition-all duration-300 ${
                    isSelected
                      ? "bg-gradient-to-br from-[#8B6F47]/50 to-[#6B5335]/40"
                      : "bg-black/40 group-hover:bg-gradient-to-br group-hover:from-[#8B6F47]/40 group-hover:to-[#6B5335]/30"
                  }`}>
                    <h3 className="text-lg md:text-xl font-semibold leading-snug">
                      {option.title}
                    </h3>
                    <p className="text-sm text-neutral-200 leading-relaxed">
                      {option.subtext}
                    </p>
                    <div className="pt-2">
                      {isSelected ? (
                        <span className="inline-flex items-center text-sm font-medium bg-gradient-to-r from-[#C4A46A] to-[#F5E6C8] text-black px-4 py-2 rounded-md">
                          Selected
                          <span className="ml-2 text-xs">→</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-sm font-medium text-white/90 group-hover:text-[#F5E6C8] transition-colors">
                          Explore
                          <span className="ml-2 text-xs">→</span>
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </LuxFadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
