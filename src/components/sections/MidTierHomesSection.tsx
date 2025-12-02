import { LuxFadeIn } from "../ui/LuxFadeIn";

const midTierListings = [
  {
    id: 1,
    label: "Move-Up Favorite",
    title: "Modern Suburban Upgrade",
    price: "$625,000",
    location: "Richardson, Texas",
    details: "4 Bed · 3 Bath · 2,400 sq ft",
  },
  {
    id: 2,
    label: "City Convenience",
    title: "Single-Story Modern Ranch",
    price: "$575,000",
    location: "Dallas, Texas",
    details: "3 Bed · 2.5 Bath · 2,050 sq ft",
  },
  {
    id: 3,
    label: "Lifestyle Upgrade",
    title: "Warm Gathering Home",
    price: "$695,000",
    location: "Plano, Texas",
    details: "4 Bed · 3.5 Bath · 2,800 sq ft",
  },
];

export default function MidTierHomesSection() {
  return (
    <section
      id="mid-tier-homes"
      className="lux-section bg-transparent text-white pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-20 lg:pb-36 scroll-mt-[-20px]"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 space-y-10">

        {/* HEADER */}
        <LuxFadeIn delay={0.05}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-300">
                Next-Step Homeownership
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                Mid-Tier <span className="text-[#F5E6C8]">Move-Up Homes</span>
              </h2>
            </div>
            <p className="max-w-xl text-sm md:text-base text-neutral-200">
              Move-up homes that offer more space and comfort while keeping a smart balance of price and location.
            </p>
          </div>
        </LuxFadeIn>

        {/* LISTING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {midTierListings.map((listing, index) => (
            <LuxFadeIn key={listing.id} delay={0.1 + index * 0.08}>
              <article className="group relative flex flex-col rounded-2xl overflow-hidden bg-black/55 border-2 border-[#C4A46A] shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] backdrop-blur-md transition-shadow duration-300">

                {/* IMAGE / PLACEHOLDER AREA */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={
                      listing.id === 1
                        ? "/images/Mid-tier-1.jpg"
                        : listing.id === 2
                        ? "/images/Mid-tier-2.jpg"
                        : "/images/Mid-tier-3.jpg"
                    }
                    alt={listing.title}
                    className="w-full h-full object-cover object-center transform group-hover:scale-[1.03] transition-transform duration-500"
                  />

                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20" />
                </div>

                {/* CONTENT */}
                <div className="flex flex-col gap-3 px-5 pt-5 pb-6 bg-black/40 group-hover:bg-gradient-to-br group-hover:from-[#8B6F47]/40 group-hover:to-[#6B5335]/30 transition-all duration-300">
                  <p className="text-[11px] tracking-[0.25em] uppercase text-neutral-300">
                    {listing.label}
                  </p>
                  <h3 className="text-lg md:text-xl font-semibold leading-snug">
                    {listing.title}
                  </h3>
                  <p className="text-sm font-medium text-[#F5E6C8]">
                    {listing.price}
                  </p>
                  <p className="text-sm text-neutral-200">
                    {listing.location}
                  </p>
                  <p className="text-xs text-neutral-300">
                    {listing.details}
                  </p>

                  <div className="pt-3">
                    <button
                      className="inline-flex items-center text-sm font-medium text-white/90 group-hover:text-[#F5E6C8] transition-colors"
                    >
                      View Details
                      <span className="ml-2 text-xs">↗</span>
                    </button>
                  </div>
                </div>
              </article>
            </LuxFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
