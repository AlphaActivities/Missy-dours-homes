import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listings, ListingCategory, ListingStatus } from '../data/listings';
import { Bed, Bath, Maximize } from 'lucide-react';
import FooterSection from '../components/sections/FooterSection';

type FilterType = 'all' | 'active' | ListingCategory;

export default function ListingsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const navigate = useNavigate();

  const filteredListings = listings.filter((listing) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'active') return listing.status === 'active';
    return listing.category === activeFilter;
  });

  const filters: { label: string; value: FilterType }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Luxury', value: 'luxury' },
    { label: 'Mid-Tier', value: 'mid' },
    { label: 'First-Time', value: 'first' },
  ];

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-16 sm:pb-20 lg:pb-24">
        <div className="text-center mb-10 sm:mb-12">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light text-gray-900 mb-4 sm:mb-6 tracking-tight">
            Active Listings
          </h1>
          <p className="text-base sm:text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed px-4">
            A curated selection of exceptional properties across North Texas. Each home represents
            an opportunity to find the perfect setting for your next chapter.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-10 sm:mb-12 px-4">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 sm:px-6 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-300 ${
                activeFilter === filter.value
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30'
                  : 'bg-white text-gray-700 hover:bg-amber-50 hover:text-amber-700 shadow-sm'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        {/* Listings Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => navigate(`/listings/${listing.slug}`)}
              className="group cursor-pointer bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image Container */}
              <div className="relative h-56 sm:h-64 overflow-hidden">
                <img
                  src={listing.heroImage}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {listing.status === 'active' && (
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-amber-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg">
                    ACTIVE
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 sm:p-6">
                <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 group-hover:text-amber-700 transition-colors">
                  {listing.title}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{listing.locationText}</p>

                <p className="text-xl sm:text-2xl font-light text-amber-700 mb-3 sm:mb-4">
                  {listing.price}
                </p>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-3 sm:gap-5 text-xs sm:text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Bed className="w-4 h-4" />
                    <span>{listing.beds} Beds</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Bath className="w-4 h-4" />
                    <span>{listing.baths} Baths</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Maximize className="w-4 h-4" />
                    <span>{listing.sqft.toLocaleString()} sqft</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredListings.length === 0 && (
          <div className="text-center py-20">
            <p className="text-xl text-gray-600">
              No listings match your current filter.
            </p>
          </div>
        )}
      </div>
      <FooterSection />
    </div>
  );
}
