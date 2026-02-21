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
    heroImage: "/images/listings/3105-palmdale-cir/3105_Palmdale_Cir01.jpg"
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
    heroImage: "/images/1-luxury/Mansion.jpg"
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
    heroImage: "/images/1-luxury/luxury-home.webp"
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
    heroImage: "/images/2-mid-tier/Mid-tier-1.jpg"
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
    heroImage: "/images/2-mid-tier/Mid-tier-2.jpg"
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
    heroImage: "/images/2-mid-tier/Mid-tier-3.jpg"
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
    heroImage: "/images/3-first-time-buyer/photo_1.jpg"
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
    heroImage: "/images/3-first-time-buyer/condo.jpg"
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
    heroImage: "/images/3-first-time-buyer/photo_2.jpg"
  }
];
