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
  createdDate?: string;
  lastUpdated?: string;
  daysOnline?: number;
  highlights?: string[];
  features?: Record<string, string[]>;
  openHouses?: OpenHouse[];
  floorplan?: string;
  specialFeatures?: {
    title: string;
    description?: string;
    categories: Array<{
      name: string;
      items: string[];
    }>;
  };
  agentRole?: "buyer" | "seller";
  brokerageAtTransaction?: string;
  soldDate?: string;
}

export const listings: Listing[] = [
  {
    id: "1",
    title: "3105 Palmdale Circle",
    price: "$565,000",
    locationText: "Farmers Branch, TX",
    beds: 4,
    baths: 2,
    sqft: 1908,
    slug: "3105-palmdale-cir",
    category: "mid",
    status: "sold",
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
    description: "Located in Farmers Branch, Texas, this single-family residence features 4 bedrooms, 2 bathrooms, and approximately 1,908 square feet of living space. Built in 1968, the property represents one of Missy Dours' successfully closed real estate transactions, where she represented the seller.",
    address: "3105 Palmdale Circle, Farmers Branch, TX 75234",
    propertyType: "Single Family Residence",
    yearBuilt: 1968,
    lotSize: "Approximately 0.216 acres",
    mlsNumber: "21170925",
    soldDate: "March 24, 2026",
    agentRole: "seller",
    brokerageAtTransaction: "Beam Real Estate, LLC",
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
    createdDate: "February 21, 2026",
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
    price: "$2,487,000",
    locationText: "Farmers Branch, TX",
    beds: 4,
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
    description: "An exceptional luxury estate offering over 6,000 square feet of refined living space on a prestigious half-acre lot in Farmers Branch. This stunning 2019-built residence combines contemporary design with timeless elegance, featuring soaring ceilings, expansive windows, and premium finishes throughout. The home's sophisticated floor plan includes four spacious bedrooms and three and a half baths, with meticulous attention to detail evident in every room. The gourmet kitchen features top-tier appliances and custom cabinetry, while the primary suite offers a private retreat featuring a spa-inspired bathroom with a soaking tub, walk-in shower, and premium designer finishes. Positioned near championship golf courses and Brookhaven Country Club, this property delivers the ultimate luxury lifestyle with easy access to Dallas's finest dining, shopping, and entertainment destinations.",
    address: "14636 Southern Pines Dr, Farmers Branch, TX 75234",
    propertyType: "Single Family Residential",
    yearBuilt: 2019,
    lotSize: "0.55 Acres (23,958 Sq Ft)",
    mlsNumber: "21216921",
    createdDate: "March 26, 2026",
    lastUpdated: "April 6, 2026",
    daysOnline: 11,
    highlights: [
      "Expansive 6,005 square feet of luxury living space",
      "Recently built in 2019 with modern design and finishes",
      "Situated on 0.55 acres in prestigious Farmers Branch location",
      "Four spacious bedrooms with three and a half baths",
      "Near championship golf courses and Brookhaven Country Club",
      "Soaring ceilings and expansive windows throughout",
      "Gourmet kitchen with top-tier appliances and custom cabinetry",
      "Spa-inspired primary bathroom with premium finishes",
      "Primary suite with spa-inspired amenities and luxury finishes"
    ],
    features: {
      Interior: [
        "6,005 square feet of living space",
        "4 spacious bedrooms and 3.5 bathrooms",
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
    floorplan: "/images/listings/14636-Southern-Pines-Dr/14636-Southern-Pines-Dr-floorplan.pdf",
    specialFeatures: {
      title: "Special Features",
      description: "This exceptional estate offers a rare blend of refined design, advanced construction quality, and luxury lifestyle features that set it apart from standard listings.",
      categories: [
        {
          name: "Construction & Structural Quality",
          items: [
            "CMU and stucco exterior construction for durability and long-term strength",
            "True pier-and-beam foundation supported by 61 concrete piers",
            "Steel I-beam structural support system",
            "Encapsulated spray-foam insulation for energy efficiency and performance",
            "Thoughtful build quality with premium materials throughout"
          ]
        },
        {
          name: "Smart Home & Technology",
          items: [
            "Integrated smart home features designed for convenience and control",
            "Whole-home audio and entertainment infrastructure",
            "Cat6 wiring and advanced media connectivity",
            "App-connected systems for streamlined day-to-day living",
            "High-end AV planning and installation for a premium experience"
          ]
        },
        {
          name: "Lighting, Comfort & Atmosphere",
          items: [
            "Layered interior and exterior lighting designed for luxury ambiance",
            "Landscape and accent lighting features that enhance evening presentation",
            "Thoughtful lighting controls for both everyday living and entertaining",
            "Designer finishes that elevate the feel of the entire home"
          ]
        },
        {
          name: "Lifestyle & Utility Features",
          items: [
            "Resort-style setting with strong indoor-outdoor flow",
            "Golf-course-area luxury positioning near Brookhaven Country Club",
            "Well-planned utility and support spaces for high-function living",
            "Premium layout decisions that support both comfort and entertaining"
          ]
        }
      ]
    }
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
  },
  {
    id: "13",
    title: "505 Lowell Lane",
    price: "$394,500",
    locationText: "Richardson, TX",
    beds: 3,
    baths: 2,
    sqft: 1551,
    slug: "505-lowell-ln",
    category: "first",
    status: "sold",
    heroImage: "/images/listings/505-lowell-ln/505-Lowell-Ln01.webp",
    galleryImages: [
      "/images/listings/505-lowell-ln/505-Lowell-Ln01.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln02.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln03.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln04.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln05.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln06.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln08.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln09.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln10.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln11.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln12.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln13.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln14.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln15.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln16.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln17.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln18.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln19.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln20.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln21.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln22.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln23.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln24.webp",
      "/images/listings/505-lowell-ln/505-Lowell-Ln25.webp"
    ],
    description: "Located in Richardson's established Northrich neighborhood, this single-story brick residence offers three bedrooms, two bathrooms, and 1,551 square feet of living space. Built in 1959, the home features refreshed interiors, an updated kitchen and bathrooms, a fireplace, and a two-car garage. Recent improvements included significant updates to major home systems. Set on approximately 0.184 acres, the property combines established neighborhood character with modernized living spaces. Missy Dours represented the buyer through Clancy Realty in the completed August 2026 transaction.",
    address: "505 Lowell Lane, Richardson, TX 75080",
    propertyType: "Single-Family Residence",
    yearBuilt: 1959,
    lotSize: "Approximately 0.184 acres (8,015 sq ft)",
    mlsNumber: "21288866",
    soldDate: "August 10, 2026",
    agentRole: "buyer",
    brokerageAtTransaction: "Clancy Realty",
    floorplan: "/images/listings/505-lowell-ln/505-Lowell-Ln20-Floor_Plan.webp",
    highlights: [
      "Renovated kitchen and bathrooms",
      "Updated major home systems",
      "Single-story brick construction",
      "Two-car garage",
      "Fireplace",
      "Established Richardson neighborhood"
    ],
    features: {
      Interior: [
        "Single-story detached home",
        "Luxury vinyl plank flooring",
        "Updated kitchen with dishwasher, gas cooktop, and refrigerator",
        "Renovated bathrooms",
        "Fireplace",
        "1,551 square feet of living space"
      ],
      Exterior: [
        "Brick construction",
        "Composition roof",
        "Pillar/post/pier foundation",
        "Two-car garage",
        "Approximately 0.184-acre lot"
      ],
      Utilities: [
        "Central air conditioning",
        "Central natural gas heating"
      ],
      Community: [
        "Richardson Independent School District",
        "Established Northrich neighborhood"
      ]
    }
  },
  {
    id: "14",
    title: "4067 Beltway Drive, Unit 121",
    price: "$275,000",
    locationText: "Addison, TX",
    beds: 2,
    baths: 2.5,
    sqft: 1029,
    slug: "4067-beltway-dr-unit-121",
    category: "first",
    status: "sold",
    heroImage: "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive01.webp",
    galleryImages: [
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive01.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive02.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive03.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive04.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive05.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive06.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive07.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive08.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive09.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive10.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive11.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive12.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive13.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive14.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive15.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive16.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive17.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive18.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive19.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive20.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive21.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive22.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive23.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive24.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive25.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive26.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive27.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive28.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive29.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive30.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive31.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive32.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive33.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive34.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive35.webp",
      "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive36.webp"
    ],
    description: "Situated in Addison's Pecan Square condominium community, this two-level residence offers two bedrooms, two full bathrooms, one half bathroom, and approximately 1,029 square feet of living space. The home features an updated kitchen, refreshed bathrooms, a welcoming living area with fireplace, and outdoor spaces including a balcony and covered patio. Residents enjoy landscaped community surroundings and access to a shared swimming pool. Missy Dours represented the buyer through Beam Real Estate, LLC in the completed December 2025 transaction.",
    address: "4067 Beltway Drive, Unit 121, Addison, TX 75001",
    propertyType: "Condominium",
    yearBuilt: 1982,
    mlsNumber: "21051647",
    soldDate: "December 12, 2025",
    agentRole: "buyer",
    brokerageAtTransaction: "Beam Real Estate, LLC",
    floorplan: "/images/listings/4067-beltway-dr-unit-121/4067-Beltway-Drive-Floor_Plan.webp",
    highlights: [
      "Updated kitchen and bathrooms",
      "Two-level condominium layout",
      "Fireplace",
      "Private balcony and covered patio",
      "One-car garage",
      "Community swimming pool",
      "Convenient Addison location"
    ],
    features: {
      Interior: [
        "Two-level floor plan",
        "Updated kitchen with modern cabinetry and appliances",
        "Updated bathrooms",
        "Fireplace in living area",
        "Hardwood/laminate flooring",
        "1,029 square feet of living space"
      ],
      Exterior: [
        "Private balcony",
        "Covered patio",
        "One-car garage",
        "Landscaped community grounds"
      ],
      Utilities: [
        "Community-maintained grounds"
      ],
      Community: [
        "Pecan Square Condominium subdivision",
        "Community swimming pool",
        "Dallas Independent School District",
        "Convenient Addison location"
      ]
    }
  }
];
