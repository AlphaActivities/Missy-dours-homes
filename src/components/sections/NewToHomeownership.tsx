import { LuxFadeIn } from "../ui/LuxFadeIn";

const starterListings = [
  {
    id: 1,
    label: "First-Time Favorite",
    title: "Sunny Suburban Starter",
    price: "$425,000",
    location: "Carrollton, Texas",
    details: "3 Bed · 2 Bath · 1,800 sq ft",
  },
  {
    id: 2,
    label: "Move-In Ready",
    title: "Quiet Cul-de-Sac Home",
    price: "$389,000",
    location: "Farmers Branch, Texas",
    details: "3 Bed · 2 Bath · 1,650 sq ft",
  },
  {
    id: 3,
    label: "New to Market",
    title: "Walkable City Condo",
    price: "$365,000",
    location: "Uptown Dallas, Texas",
    details: "2 Bed · 2 Bath · 1,250 sq ft",
  },
];

export default function NewToHomeownershipSection() {
  return (
    <section
      id="new-to-homeownership"
      className="lux-section bg-transparent text-white pt-12 pb-24 md:pt-16 md:pb-32 lg:pt-20 lg:pb-36"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 space-y-10">

        {/* HEADER */}
        <LuxFadeIn delay={0.05}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-300">
                New to Home Ownership
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight">
                First-Time Buyer <span className="text-[#F5E6C8]">Friendly Homes</span>
              </h2>
            </div>
            <p className="max-w-xl text-sm md:text-base text-neutral-200">
              These properties showcase the type of approachable,
              well-located homes Missy curates for clients who are purchasing
              their first home or re-entering the market with a fresh start.
            </p>
          </div>
        </LuxFadeIn>

        {/* LISTING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {starterListings.map((listing, index) => (
            <LuxFadeIn key={listing.id} delay={0.1 + index * 0.08}>
              <article className="group relative flex flex-col rounded-2xl overflow-hidden bg-black/55 border-2 border-[#C4A46A] shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] backdrop-blur-md transition-shadow duration-300 select-none">

                {/* IMAGE / PLACEHOLDER AREA */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={
                      listing.id === 1
                        ? "/images/3-first-time-buyer/photo_1.jpg"
                        : listing.id === 2
                        ? "/images/3-first-time-buyer/photo_2.jpg"
                        : "/images/3-first-time-buyer/condo.jpg"
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

                </div>
              </article>
            </LuxFadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
