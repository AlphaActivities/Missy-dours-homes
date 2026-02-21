import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listings, ListingCategory, ListingStatus } from '../data/listings';
import { Bed, Bath, Maximize } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/30">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-light text-gray-900 mb-6 tracking-tight">
            Active Listings
          </h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto leading-relaxed">
            A curated selection of exceptional properties across North Texas. Each home represents
            an opportunity to find the perfect setting for your next chapter.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {filters.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredListings.map((listing) => (
            <div
              key={listing.id}
              onClick={() => navigate(`/listings/${listing.slug}`)}
              className="group cursor-pointer bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
            >
              {/* Image Container */}
              <div className="relative h-64 overflow-hidden">
                <img
                  src={listing.heroImage}
                  alt={listing.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                {listing.status === 'active' && (
                  <div className="absolute top-4 right-4 bg-amber-600 text-white px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg">
                    ACTIVE
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="text-xl font-medium text-gray-900 mb-2 group-hover:text-amber-700 transition-colors">
                  {listing.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{listing.locationText}</p>

                <p className="text-2xl font-light text-amber-700 mb-4">
                  {listing.price}
                </p>

                {/* Stats */}
                <div className="flex items-center gap-5 text-sm text-gray-600">
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
    </div>
  );
}
