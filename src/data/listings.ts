export type ListingCategory = "luxury" | "mid" | "first";
export type ListingStatus = "active" | "pending" | "sold" | "placeholder";

export interface OpenHouse {
  date: string;
  startTime?: string;
  endTime?: string;
  type: "public" | "broker" | "private";
  notes?: string;
}

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
  propertyType?: string;
  yearBuilt?: number;
  lotSize?: string;
  mlsNumber?: string;
  lastUpdated?: string;
  daysOnline?: number;
  highlights?: string[];
  features?: Record<string, string[]>;
  openHouses?: OpenHouse[];
  floorplan?: string;
}

export const listings: Listing[] = [
  {
    id: "1",
    title: "3105 Palmdale Circle",
    price: "$565,000",
    locationText: "Highland Park, Dallas",
    beds: 5,
    baths: 4,
    sqft: 4850,
    slug: "3105-palmdale-cir",
    category: "mid",
    status: "pending",
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
    address: "3105 Palmdale Circle, Highland Park, Dallas, TX",
    propertyType: "Single Family Residence",
    yearBuilt: 2008,
    lotSize: "0.32 acres",
    mlsNumber: "20745891",
    lastUpdated: "February 18, 2026",
    daysOnline: 12,
    highlights: [
      "Soaring ceilings with custom millwork and architectural details",
      "Chef's kitchen with high-end appliances and center island",
      "Primary suite with spa-inspired bath and walk-in closets",
      "Covered outdoor patio with mature landscaping",
      "Premium location in prestigious Highland Park",
      "Smart home technology and security system"
    ],
    features: {
      Interior: [
        "Hardwood floors throughout main living areas",
        "Custom built-ins and designer lighting",
        "Gourmet kitchen with premium appliances",
        "Formal dining room with tray ceiling",
        "Primary suite with sitting area",
        "Walk-in closets with custom organization"
      ],
      Exterior: [
        "Covered patio with ceiling fans",
        "Professionally landscaped grounds",
        "Sprinkler system",
        "Two-car attached garage",
        "Brick and stone exterior"
      ],
      Utilities: [
        "Central heating and air conditioning",
        "High-efficiency HVAC system",
        "Tankless water heater",
        "Energy-efficient windows"
      ],
      Community: [
        "Highland Park Independent School District",
        "Walking distance to parks and shopping",
        "Low-traffic residential street",
        "Award-winning schools"
      ]
    }
  },
  {
    id: "11",
    title: "1722 Barclay Dr",
    price: "$365,000",
    locationText: "Richardson, TX",
    beds: 3,
    baths: 2,
    sqft: 1873,
    slug: "1722-barclay-dr",
    category: "first",
    status: "sold",
    heroImage: "/images/listings/1722-barclay-Dr/1722_Barclay_Dr01.webp",
    galleryImages: [
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr01.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr02.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr03.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr04.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr05.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr06.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr07.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr08.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr09.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr10.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr11.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr12.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr13.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr14.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr15.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr16.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr17.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr18.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr19.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr20.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr21.webp",
      "/images/listings/1722-barclay-Dr/1722_Barclay_Dr22.webp"
    ],
    description: "A beautifully maintained single-family home in Richardson's highly desirable Yale Park neighborhood. This 3-bedroom, 2-bath residence offers 1,873 square feet of comfortable living space on a generous lot. The home features vaulted ceilings that create an open and airy atmosphere, along with a wet bar perfect for entertaining. The well-appointed kitchen showcases granite countertops and built-in features in a functional galley layout. Additional highlights include a cozy wood-burning fireplace, spacious walk-in closets, and a 2-car garage. Located in the award-winning Richardson ISD with access to Yale Elementary, Apollo Junior High, and Berkner High School. This home generated strong buyer interest and sold successfully in a competitive multiple-offer situation.",
    address: "1722 Barclay Dr, Richardson, TX 75081",
    propertyType: "Single Family Residence",
    yearBuilt: 1980,
    lotSize: "9,017 sq ft",
    mlsNumber: "21156282",
    lastUpdated: "March 6, 2026",
    daysOnline: 14,
    highlights: [
      "Vaulted ceilings creating spacious, open living areas",
      "Wet bar ideal for entertaining guests",
      "Granite countertops and built-in kitchen features",
      "Wood-burning fireplace for cozy ambiance",
      "Generous walk-in closets for ample storage",
      "Award-winning Richardson ISD schools",
      "Yale Park neighborhood with curbs and sidewalks",
      "Successfully sold in competitive multiple-offer situation"
    ],
    features: {
      Interior: [
        "Vaulted ceilings throughout main areas",
        "Wet bar for entertaining",
        "Galley kitchen with granite counters",
        "Built-in kitchen features",
        "Wood-burning fireplace",
        "Walk-in closets",
        "1,873 square feet of living space"
      ],
      Exterior: [
        "Two-car garage",
        "Generous 9,017 sq ft lot",
        "Curbs and sidewalks",
        "Yale Park neighborhood setting"
      ],
      Utilities: [
        "Public water service",
        "Public sewer service",
        "Central heating and air"
      ],
      Community: [
        "Richardson Independent School District",
        "Yale Elementary School",
        "Apollo Junior High School",
        "Berkner High School",
        "Established Yale Park neighborhood"
      ]
    }
  },
  {
    id: "12",
    title: "14636 Southern Pines Dr",
    price: "$2,500,000",
    locationText: "Farmers Branch, TX",
    beds: 3,
    baths: 3.5,
    sqft: 6005,
    slug: "14636-southern-pines-dr",
    category: "luxury",
    status: "active",
    heroImage: "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr01.webp",
    galleryImages: [
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr01.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr02.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr03.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr04.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr05.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr06.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr07.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr08.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr09.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr10.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr11.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr12.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr13.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr14.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr15.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr16.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr17.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr18.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr19.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr20.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr21.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr22.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr23.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr24.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr25.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr26.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr27.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr28.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr29.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr30.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr31.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr32.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr33.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr34.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr35.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr36.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr37.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr38.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr39.webp",
      "/images/listings/14636-Southern-Pines-Dr/14636_Southern_Pines_Dr40.webp"
    ],
    description: "An exceptional luxury estate offering over 6,000 square feet of refined living space on a prestigious half-acre lot in Farmers Branch. This stunning 2019-built residence combines contemporary design with timeless elegance, featuring soaring ceilings, expansive windows, and premium finishes throughout. The home's sophisticated floor plan includes three spacious bedrooms and three and a half baths, with meticulous attention to detail evident in every room. The gourmet kitchen features top-tier appliances and custom cabinetry, while the primary suite offers a private retreat featuring a spa-inspired bathroom with a soaking tub, walk-in shower, and premium designer finishes. Positioned near championship golf courses and Brookhaven Country Club, this property delivers the ultimate luxury lifestyle with easy access to Dallas's finest dining, shopping, and entertainment destinations.",
    address: "14636 Southern Pines Dr, Farmers Branch, TX 75234",
    propertyType: "Single Family Residential",
    yearBuilt: 2019,
    lotSize: "0.55 Acres (23,958 Sq Ft)",
    mlsNumber: "21216921",
    lastUpdated: "March 28, 2026",
    daysOnline: 2,
    highlights: [
      "Expansive 6,005 square feet of luxury living space",
      "Recently built in 2019 with modern design and finishes",
      "Situated on 0.55 acres in prestigious Farmers Branch location",
      "Three spacious bedrooms with three and a half baths",
      "Near championship golf courses and Brookhaven Country Club",
      "Soaring ceilings and expansive windows throughout",
      "Gourmet kitchen with top-tier appliances and custom cabinetry",
      "Spa-inspired primary bathroom with premium finishes",
      "Primary suite with spa-inspired amenities and luxury finishes"
    ],
    features: {
      Interior: [
        "6,005 square feet of living space",
        "3 spacious bedrooms and 3.5 bathrooms",
        "Soaring ceilings with architectural details",
        "Expansive windows for natural light",
        "Gourmet kitchen with top-tier appliances",
        "Custom cabinetry and premium finishes",
        "Spa-inspired primary bathroom with soaking tub, walk-in shower, and designer finishes",
        "Open floor plan for entertaining"
      ],
      Exterior: [
        "0.55-acre lot (23,958 sq ft)",
        "Professionally landscaped grounds",
        "Private estate setting",
        "Multiple outdoor living areas",
        "Attached garage with storage"
      ],
      Location: [
        "Prestigious Farmers Branch location",
        "Near championship golf courses",
        "Close to Brookhaven Country Club",
        "Easy access to Dallas dining and shopping",
        "Minutes from major thoroughfares"
      ],
      Community: [
        "Carrollton-Farmers Branch ISD",
        "Established luxury neighborhood",
        "Country club proximity",
        "Upscale community setting"
      ]
    },
    openHouses: [
      {
        date: "March 31, 2026",
        type: "broker",
        notes: "Broker and agent preview"
      },
      {
        date: "April 4, 2026",
        startTime: "2:00 PM",
        endTime: "4:00 PM",
        type: "public"
      }
    ],
    floorplan: "/images/listings/14636-Southern-Pines-Dr/14636-Southern-Pines-Dr-floorplan.pdf"
  },
  {
    id: "2",
    title: "Modern Golf Course Retreat",
    price: "$3,250,000",
    locationText: "Dallas",
    beds: 5,
    baths: 6,
    sqft: 6200,
    slug: "modern-golf-course-retreat",
    category: "luxury",
    status: "placeholder",
    heroImage: "/images/communities/golfhouse.webp",
    galleryImages: ["/images/communities/golfhouse.webp"],
    description: "A stunning modern retreat overlooking pristine golf course views. This exceptional property combines contemporary architecture with luxury finishes, offering an unparalleled living experience in one of Dallas's most prestigious locations. Features include expansive living areas, a chef's kitchen, spa-like primary suite, and resort-style outdoor spaces perfect for entertaining.",
    address: "Dallas, TX"
  },
  {
    id: "10",
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
