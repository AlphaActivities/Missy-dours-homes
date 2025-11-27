import { LuxFadeIn } from "../ui/LuxFadeIn";

const communities = [
  {
    id: 1,
    name: "Preston Hollow",
    tagline: "Tree-lined estates and timeless architecture.",
    image: "/images/prestonhollow.webp",
  },
  {
    id: 2,
    name: "Highland Park",
    tagline: "Historic charm with premier park and lake access.",
    image: "/images/highlandpark.webp",
  },
  {
    id: 3,
    name: "Southlake",
    tagline: "Family-focused luxury with top-rated schools.",
    image: "/images/southlake.webp",
  },
  {
    id: 4,
    name: "Uptown Dallas",
    tagline: "Walkable city lifestyle with high-rise views.",
    image: "/images/uptowndallas.webp",
  },
  {
    id: 5,
    name: "Brookhaven",
    tagline: "Established neighborhood living with convenient city access.",
    image: "/images/residencehouse.webp",
  },
  {
    id: 6,
    name: "Vista Point",
    tagline: "Family-friendly community with parks and everyday amenities.",
    image: "/images/hilltophouse.webp",
  },
];

export default function CommunitiesSection() {
  return (
    <section
      id="communities"
      className="lux-section bg-white text-black py-24 md:py-32 lg:py-36"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-16 space-y-10">

        {/* HEADER */}
        <LuxFadeIn delay={0.05}>
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-500">
                Explore The Areas
              </p>
              <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-neutral-900">
                Signature <span className="text-[#C4A46A]">Communities</span>
              </h2>
            </div>
            <p className="max-w-xl text-sm md:text-base text-neutral-600">
              From gated golf-course enclaves to established in-town neighborhoods,
              Missy guides clients to the communities that best match their lifestyle,
              investment goals, and long-term vision.
            </p>
          </div>
        </LuxFadeIn>

        {/* COMMUNITY GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {communities.map((community, index) => (
            <LuxFadeIn key={community.id} delay={0.1 + index * 0.06}>
              <article className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] border-2 border-[#C4A46A] shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] transition-shadow duration-300">

                {/* IMAGE / PLACEHOLDER */}
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={community.image}
                    alt={community.name}
                    className="w-full h-[280px] object-cover rounded-t-2xl"
                  />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5" />
                </div>

                {/* CONTENT */}
                <div className="px-5 pt-5 pb-6 flex flex-col gap-2 bg-white/95 group-hover:bg-gradient-to-br group-hover:from-[#f5e9d0]/60 group-hover:to-[#ead4a8]/50 transition-all duration-300">
                  <h3 className="text-lg font-semibold text-neutral-900">
                    {community.name}
                  </h3>
                  <p className="text-sm text-neutral-600">
                    {community.tagline}
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
