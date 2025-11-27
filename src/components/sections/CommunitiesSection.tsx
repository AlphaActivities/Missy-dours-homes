import { LuxFadeIn } from "../ui/LuxFadeIn";

type Community = {
  id: number;
  name: string;
  tagline: string;
  image: string;
};

const luxuryCommunities: Community[] = [
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
    name: "Westlake",
    tagline: "Resort-style living with golf and lake views.",
    image: "/images/westlakepark.webp",
  },
  {
    id: 4,
    name: "Southlake",
    tagline: "Award-winning schools and spacious custom homes.",
    image: "/images/southlake.webp",
  },
  {
    id: 5,
    name: "Uptown Dallas",
    tagline: "Walkable city lifestyle with high-rise views.",
    image: "/images/uptowndallas.webp",
  },
];

const familyCommunities: Community[] = [
  {
    id: 6,
    name: "Brookhaven",
    tagline: "Established neighborhood living with a welcoming community feel.",
    image: "/images/residencehouse.webp",
  },
  {
    id: 7,
    name: "Vista Point",
    tagline: "Family-friendly streets with park, trail, and lake access.",
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
        {/* CHOOSE YOUR PATH */}
        <LuxFadeIn delay={0.05}>
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-500">
              Find Your Ideal Community
            </p>
            <h2 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight text-neutral-900">
              Explore{" "}
              <span className="text-[#C4A46A]">Where Life Fits Best</span>
            </h2>
            <p className="mt-4 text-sm md:text-base text-neutral-600">
              Whether you are drawn to established luxury enclaves or warm,
              family-focused neighborhoods, Missy helps you navigate
              Dallas–Fort Worth communities with clarity and confidence.
            </p>

            <div className="mt-8 grid gap-6 md:grid-cols-2">
              <a
                href="#luxury-communities"
                className="group rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm px-6 py-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition-shadow duration-300"
              >
                <p className="text-[0.7rem] md:text-xs tracking-[0.22em] uppercase text-[#9b8b6a] mb-2">
                  Path One
                </p>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900">
                  Luxury & Upscale Communities
                </h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Explore premier neighborhoods with golf courses, gated
                  streets, and architecturally significant homes.
                </p>
                <p className="mt-3 text-xs font-medium text-[#C4A46A] group-hover:underline underline-offset-4">
                  View luxury communities →
                </p>
              </a>

              <a
                href="#family-communities"
                className="group rounded-2xl border border-neutral-200 bg-white/80 backdrop-blur-sm px-6 py-5 text-left shadow-[0_18px_45px_rgba(15,23,42,0.06)] hover:shadow-[0_18px_45px_rgba(15,23,42,0.14)] transition-shadow duration-300"
              >
                <p className="text-[0.7rem] md:text-xs tracking-[0.22em] uppercase text-[#9b8b6a] mb-2">
                  Path Two
                </p>
                <h3 className="text-lg md:text-xl font-semibold text-neutral-900">
                  Neighborhood & First-Time Buyer Areas
                </h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Discover welcoming streets, parks, schools, and communities
                  ideal for first-time buyers and growing households.
                </p>
                <p className="mt-3 text-xs font-medium text-[#C4A46A] group-hover:underline underline-offset-4">
                  View family-focused areas →
                </p>
              </a>
            </div>
          </div>
        </LuxFadeIn>

        {/* LUXURY COMMUNITIES */}
        <div id="luxury-communities" className="space-y-6">
          <LuxFadeIn delay={0.1}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-500">
                  Explore The Areas
                </p>
                <h3 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight text-neutral-900">
                  Luxury & Upscale Communities
                </h3>
              </div>
              <p className="max-w-xl text-sm md:text-base text-neutral-600">
                From gated golf-course enclaves to established in-town
                neighborhoods, Missy guides clients to premier communities
                that align with their lifestyle, investment goals, and
                long-term vision.
              </p>
            </div>
          </LuxFadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {luxuryCommunities.map((community, index) => (
              <LuxFadeIn
                key={community.id}
                delay={0.15 + index * 0.06}
              >
                <article className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-neutral-200/80 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition-shadow duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={community.image}
                      alt={community.name}
                      className="w-full h-[280px] object-cover rounded-t-2xl"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5" />
                  </div>

                  <div className="px-5 pt-5 pb-6 flex flex-col gap-2 bg-gradient-to-b from-white via-white to-[#f7f1e4]/80">
                    <h4 className="text-lg font-semibold text-neutral-900">
                      {community.name}
                    </h4>
                    <p className="text-sm text-neutral-600">
                      {community.tagline}
                    </p>
                  </div>
                </article>
              </LuxFadeIn>
            ))}
          </div>
        </div>

        {/* FAMILY / FIRST-TIME BUYER COMMUNITIES */}
        <div id="family-communities" className="space-y-6">
          <LuxFadeIn delay={0.12}>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <div>
                <p className="text-xs md:text-sm tracking-[0.25em] uppercase text-neutral-500">
                  For Every Season Of Life
                </p>
                <h3 className="mt-3 text-2xl md:text-3xl lg:text-4xl font-semibold leading-tight text-neutral-900">
                  Neighborhood & First-Time Buyer Areas
                </h3>
              </div>
              <p className="max-w-xl text-sm md:text-base text-neutral-600">
                Many of Missy&apos;s clients are looking for comfortable,
                approachable communities that still offer strong long-term
                value. These areas blend everyday convenience with a
                welcoming, neighborly feel.
              </p>
            </div>
          </LuxFadeIn>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {familyCommunities.map((community, index) => (
              <LuxFadeIn
                key={community.id}
                delay={0.16 + index * 0.06}
              >
                <article className="group relative overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_rgba(15,23,42,0.10)] border border-neutral-200/80 hover:shadow-[0_24px_60px_rgba(15,23,42,0.18)] transition-shadow duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={community.image}
                      alt={community.name}
                      className="w-full h-[280px] object-cover rounded-t-2xl"
                    />
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/5" />
                  </div>

                  <div className="px-5 pt-5 pb-6 flex flex-col gap-2 bg-gradient-to-b from-white via-white to-[#f7f3ea]/80">
                    <h4 className="text-lg font-semibold text-neutral-900">
                      {community.name}
                    </h4>
                    <p className="text-sm text-neutral-600">
                      {community.tagline}
                    </p>
                  </div>
                </article>
              </LuxFadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
