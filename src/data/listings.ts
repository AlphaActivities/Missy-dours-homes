export type ListingCategory = "luxury" | "mid" | "first";
export type ListingStatus = "active" | "placeholder";

export interface Listing {
  id: string;
  title: string;
  price: string;
  locationText: string;
  beds: number;
  baths: number;
  sqft: number;
  slug: string;
  category: ListingCategory;
  status: ListingStatus;
  heroImage: string;
  galleryImages: string[];
  description: string;
  address: string;
}

export const listings: Listing[] = [
  {
    id: "1",
    title: "3105 Palmdale Circle",
    price: "$2,495,000",
    locationText: "Highland Park, Dallas",
    beds: 5,
    baths: 4,
    sqft: 4850,
    slug: "3105-palmdale-cir",
    category: "luxury",
    status: "active",
    heroImage: "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir01.webp",
    galleryImages: [
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir01.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir02.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir03.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir04.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir05.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir06.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir07.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir08.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir09.webp",
      "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir10.webp"
    ],
    description: "An exceptional Highland Park residence offering timeless elegance and modern luxury. This meticulously maintained home features soaring ceilings, custom millwork, and designer finishes throughout. The chef's kitchen opens to a spacious family room with fireplace, perfect for entertaining. The primary suite offers a private retreat with spa-inspired bath and generous closet space. Expansive outdoor living areas include a covered patio and mature landscaping. Located in one of Dallas's most prestigious neighborhoods, this home provides the perfect blend of sophistication and comfort.",
    address: "3105 Palmdale Circle, Highland Park, Dallas, TX"
  },
  {
    id: "2",
    title: "Luxury Estate Collection",
    price: "$3,500,000+",
    locationText: "Preston Hollow",
    beds: 6,
    baths: 5,
    sqft: 6500,
    slug: "luxury-estate-collection",
    category: "luxury",
    status: "placeholder",
    heroImage: "/images/1-luxury/Mansion.jpg",
    galleryImages: ["/images/1-luxury/Mansion.jpg"],
    description: "A stunning collection of luxury estates in the prestigious Preston Hollow community. These exceptional properties offer the finest in North Texas living with custom architectural details and resort-style amenities.",
    address: "Preston Hollow, Dallas, TX"
  },
  {
    id: "3",
    title: "Executive Residence",
    price: "$4,200,000",
    locationText: "Southlake",
    beds: 5,
    baths: 5,
    sqft: 5800,
    slug: "executive-residence",
    category: "luxury",
    status: "placeholder",
    heroImage: "/images/1-luxury/luxury-home.webp",
    galleryImages: ["/images/1-luxury/luxury-home.webp"],
    description: "A masterfully designed executive residence in the heart of Southlake. This architectural masterpiece combines contemporary elegance with functional luxury, perfect for discerning buyers seeking the finest in North Texas living.",
    address: "Southlake, TX"
  },
  {
    id: "4",
    title: "Modern Family Home",
    price: "$875,000",
    locationText: "Trophy Club",
    beds: 4,
    baths: 3,
    sqft: 3200,
    slug: "modern-family-home",
    category: "mid",
    status: "placeholder",
    heroImage: "/images/2-mid-tier/Mid-tier-1.jpg",
    galleryImages: ["/images/2-mid-tier/Mid-tier-1.jpg"],
    description: "A beautifully appointed family home in Trophy Club offering modern comfort and style. This well-designed residence features open living spaces, updated finishes, and a prime location in a sought-after community.",
    address: "Trophy Club, TX"
  },
  {
    id: "5",
    title: "Contemporary Living",
    price: "$725,000",
    locationText: "Grapevine",
    beds: 4,
    baths: 2,
    sqft: 2850,
    slug: "contemporary-living",
    category: "mid",
    status: "placeholder",
    heroImage: "/images/2-mid-tier/Mid-tier-2.jpg",
    galleryImages: ["/images/2-mid-tier/Mid-tier-2.jpg"],
    description: "Contemporary living at its finest in Grapevine. This thoughtfully designed home offers modern amenities and flexible living spaces, ideal for today's lifestyle in a vibrant community.",
    address: "Grapevine, TX"
  },
  {
    id: "6",
    title: "Elegant Mid-Tier Estate",
    price: "$950,000",
    locationText: "Colleyville",
    beds: 4,
    baths: 3,
    sqft: 3500,
    slug: "elegant-mid-tier",
    category: "mid",
    status: "placeholder",
    heroImage: "/images/2-mid-tier/Mid-tier-3.jpg",
    galleryImages: ["/images/2-mid-tier/Mid-tier-3.jpg"],
    description: "An elegant estate in the prestigious Colleyville community. This refined home combines classic architecture with modern conveniences, situated in one of North Texas's most desirable locations.",
    address: "Colleyville, TX"
  },
  {
    id: "7",
    title: "Starter Home Perfection",
    price: "$425,000",
    locationText: "North Dallas",
    beds: 3,
    baths: 2,
    sqft: 1850,
    slug: "starter-home-perfection",
    category: "first",
    status: "placeholder",
    heroImage: "/images/3-first-time-buyer/photo_1.jpg",
    galleryImages: ["/images/3-first-time-buyer/photo_1.jpg"],
    description: "The perfect starter home in North Dallas. This charming residence offers everything first-time buyers need to begin their homeownership journey in a welcoming community with excellent amenities.",
    address: "North Dallas, TX"
  },
  {
    id: "8",
    title: "Downtown Condo",
    price: "$385,000",
    locationText: "Uptown Dallas",
    beds: 2,
    baths: 2,
    sqft: 1450,
    slug: "downtown-condo",
    category: "first",
    status: "placeholder",
    heroImage: "/images/3-first-time-buyer/condo.jpg",
    galleryImages: ["/images/3-first-time-buyer/condo.jpg"],
    description: "Urban living at its best in the heart of Uptown Dallas. This modern condo offers low-maintenance living with walkability to dining, entertainment, and cultural attractions.",
    address: "Uptown Dallas, TX"
  },
  {
    id: "9",
    title: "First Home Opportunity",
    price: "$465,000",
    locationText: "Plano",
    beds: 3,
    baths: 2,
    sqft: 2100,
    slug: "first-home-opportunity",
    category: "first",
    status: "placeholder",
    heroImage: "/images/3-first-time-buyer/photo_2.jpg",
    galleryImages: ["/images/3-first-time-buyer/photo_2.jpg"],
    description: "An excellent opportunity for first-time homebuyers in Plano. This well-maintained home features move-in ready condition with access to top-rated schools and community amenities.",
    address: "Plano, TX"
  }
];
