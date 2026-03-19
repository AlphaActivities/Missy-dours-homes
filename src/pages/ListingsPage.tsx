import { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { listings, ListingCategory, ListingStatus } from '../data/listings';
import { Bed, Bath, Maximize, ArrowLeft, Home } from 'lucide-react';
import FooterSection from '../components/sections/FooterSection';
import { motion, AnimatePresence } from 'framer-motion';
import { luxuryScrollToTop } from '../utils/luxuryScroll';

type FilterType = 'all' | 'active' | ListingCategory;

export default function ListingsPage() {
  const [searchParams] = useSearchParams();
  const filterParam = searchParams.get('filter') as FilterType | null;
  const [activeFilter, setActiveFilter] = useState<FilterType>(filterParam || 'all');
  const [isLoading, setIsLoading] = useState(false);
  const [displayedListings, setDisplayedListings] = useState(listings);
  const navigate = useNavigate();

  useEffect(() => {
    luxuryScrollToTop(1400);
  }, []);

  useEffect(() => {
    if (filterParam && ['all', 'active', 'luxury', 'mid', 'first'].includes(filterParam)) {
      setActiveFilter(filterParam);
    }
  }, [filterParam]);

  useEffect(() => {
    const filtered = listings.filter((listing) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'active') return listing.status === 'active';
      return listing.category === activeFilter;
    });
    setDisplayedListings(filtered);
  }, [activeFilter]);

  const handleFilterChange = (newFilter: FilterType) => {
    if (newFilter === activeFilter) return;

    setIsLoading(true);
    setActiveFilter(newFilter);

    setTimeout(() => {
      setIsLoading(false);
    }, 600);
  };

  const filteredListings = displayedListings;

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
        {/* Back to Home Button */}
        <div className="-mt-5 mb-6 sm:mb-8 lg:mb-12">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C4A46A]/70 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.18)] ring-1 ring-[#C4A46A]/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_35px_rgba(15,23,42,0.25)] overflow-hidden text-sm sm:text-base font-medium"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            <ArrowLeft className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="relative z-10">Back to Home</span>
          </Link>
        </div>

        {/* Add 20px spacing */}
        <div className="h-5" />

        <div className="text-center mb-10 sm:mb-12">
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl mb-4 sm:mb-6 px-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #8B7355 0%, #C4A46A 40%, #D4B57A 60%, #8B7355 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 2px 4px rgba(139, 115, 85, 0.1)',
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))',
            }}
          >
            ACTIVE LISTINGS
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#C4A46A] to-transparent mb-6 sm:mb-8" />
          <p
            className="text-base sm:text-lg max-w-3xl mx-auto leading-relaxed px-4"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              color: '#4A4A4A',
              letterSpacing: '0.015em',
            }}
          >
            A curated selection of exceptional properties across North Texas. Each home represents
            an opportunity to find the perfect setting for your next chapter.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:gap-6 mb-10 sm:mb-12 px-4">
          {/* All & Active Buttons Container */}
          <div className="flex justify-center gap-3 sm:gap-4 bg-gradient-to-br from-[#1a3a52] to-[#0d2333] p-3 rounded-full shadow-[0_8px_32px_rgba(26,58,82,0.4)]">
            <button
              onClick={() => handleFilterChange('all')}
              disabled={isLoading}
              className={`relative px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all duration-500 overflow-hidden border-2 ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] text-black shadow-[0_0_30px_rgba(196,164,106,0.8)] border-transparent scale-105'
                  : 'bg-gradient-to-br from-[#2d5571] to-[#1f4059] text-[#C4A46A] hover:bg-gradient-to-br hover:from-[#375d7a] hover:to-[#274a62] hover:shadow-[0_0_15px_rgba(196,164,106,0.3)] hover:scale-105 border-[#C4A46A]'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">ALL</span>
              {activeFilter === 'all' && (
                <>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.5s_infinite]" />
                  <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse" />
                </>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('active')}
              disabled={isLoading}
              className={`relative px-6 sm:px-8 py-3 rounded-full text-xs sm:text-sm font-semibold tracking-wide transition-all duration-500 overflow-hidden border-2 ${
                activeFilter === 'active'
                  ? 'bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] text-black shadow-[0_0_30px_rgba(196,164,106,0.8)] border-transparent scale-105'
                  : 'bg-gradient-to-br from-[#2d5571] to-[#1f4059] text-[#C4A46A] hover:bg-gradient-to-br hover:from-[#375d7a] hover:to-[#274a62] hover:shadow-[0_0_15px_rgba(196,164,106,0.3)] hover:scale-105 border-[#C4A46A]'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">ACTIVE</span>
              {activeFilter === 'active' && (
                <>
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_1.5s_infinite]" />
                  <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-pulse" />
                </>
              )}
            </button>
          </div>

          {/* Category Buttons Container */}
          <div className="flex justify-center gap-2 sm:gap-4 bg-white/60 backdrop-blur-sm p-3 rounded-full shadow-[0_4px_24px_rgba(196,164,106,0.15)] border-2 border-[#C4A46A]/30">
            <button
              onClick={() => handleFilterChange('luxury')}
              disabled={isLoading}
              className={`relative px-3 sm:px-7 py-3 rounded-full text-[0.65rem] sm:text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden ${
                activeFilter === 'luxury'
                  ? 'bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] text-black shadow-[0_0_30px_rgba(196,164,106,0.8)] scale-105'
                  : 'bg-gradient-to-br from-[#F5E6C8] to-[#E8D5B5] text-[#6B5335] hover:shadow-[0_4px_12px_rgba(139,111,71,0.25)] hover:scale-105'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">LUXURY</span>
              {activeFilter === 'luxury' && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      width: '50%',
                      animation: 'subtleShimmer 2s ease-in-out infinite',
                    }}
                  />
                </>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('mid')}
              disabled={isLoading}
              className={`relative px-3 sm:px-7 py-3 rounded-full text-[0.65rem] sm:text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden ${
                activeFilter === 'mid'
                  ? 'bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] text-black shadow-[0_0_30px_rgba(196,164,106,0.8)] scale-105'
                  : 'bg-gradient-to-br from-[#F5E6C8] to-[#E8D5B5] text-[#6B5335] hover:shadow-[0_4px_12px_rgba(139,111,71,0.25)] hover:scale-105'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">MID-TIER</span>
              {activeFilter === 'mid' && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      width: '50%',
                      animation: 'subtleShimmer 2s ease-in-out infinite',
                    }}
                  />
                </>
              )}
            </button>
            <button
              onClick={() => handleFilterChange('first')}
              disabled={isLoading}
              className={`relative px-3 sm:px-7 py-3 rounded-full text-[0.65rem] sm:text-sm font-semibold tracking-wide transition-all duration-300 whitespace-nowrap overflow-hidden ${
                activeFilter === 'first'
                  ? 'bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] text-black shadow-[0_0_30px_rgba(196,164,106,0.8)] scale-105'
                  : 'bg-gradient-to-br from-[#F5E6C8] to-[#E8D5B5] text-[#6B5335] hover:shadow-[0_4px_12px_rgba(139,111,71,0.25)] hover:scale-105'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="relative z-10">FIRST-TIME</span>
              {activeFilter === 'first' && (
                <>
                  <span className="absolute inset-0 rounded-full border-2 border-white/50 animate-pulse" />
                  <span
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%)',
                      width: '50%',
                      animation: 'subtleShimmer 2s ease-in-out infinite',
                    }}
                  />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Listings Grid */}
        <div className="relative min-h-[400px]">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {[...Array(6)].map((_, index) => (
                <motion.div
                  key={`skeleton-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white rounded-xl overflow-hidden shadow-md"
                >
                  <div className="relative h-56 sm:h-64 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer bg-[length:200%_100%]" />
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="h-6 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded animate-shimmer bg-[length:200%_100%]" />
                    <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-3/4 animate-shimmer bg-[length:200%_100%]" />
                    <div className="h-7 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-1/2 animate-shimmer bg-[length:200%_100%]" />
                    <div className="flex gap-3 sm:gap-5">
                      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-shimmer bg-[length:200%_100%]" />
                      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-shimmer bg-[length:200%_100%]" />
                      <div className="h-4 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 rounded w-16 animate-shimmer bg-[length:200%_100%]" />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div
              key={activeFilter}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8"
            >
              <AnimatePresence mode="popLayout">
                {filteredListings.map((listing, index) => (
                  <motion.div
                    key={listing.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.05,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    onClick={() =>
                      navigate(`/listings/${listing.slug}?from=${activeFilter}`, {
                        state: {
                          transitionPreview: {
                            heroImage: listing.heroImage,
                            title: listing.title,
                            price: listing.price,
                          },
                        },
                      })
                    }
                    className="group cursor-pointer bg-white rounded-xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
                  >
                    <div className="relative h-56 sm:h-64 overflow-hidden">
                      <img
                        src={listing.heroImage}
                        alt={listing.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      {(listing.status === 'active' || listing.status === 'pending' || listing.status === 'sold') && (
                        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 group/badge">
                          <div className="relative">
                            <div className={`absolute inset-0 rounded-full blur-md opacity-75 ${
                              listing.status === 'active' ? 'bg-gradient-to-r from-amber-600 to-orange-600 animate-pulse' :
                              listing.status === 'pending' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 animate-pulse' :
                              'bg-gradient-to-r from-emerald-600 to-green-600'
                            }`} />
                            <div className={`relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-[0_4px_20px_rgba(217,119,6,0.5)] backdrop-blur-sm ${
                              listing.status === 'active' ? 'bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 border border-amber-400/50' :
                              listing.status === 'pending' ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-700 border border-blue-400/50' :
                              'bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 border border-emerald-400/50'
                            }`}>
                              <div className="relative">
                                <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                                {listing.status !== 'sold' && (
                                  <div className="absolute inset-0 animate-ping opacity-30">
                                    <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={2.5} />
                                  </div>
                                )}
                              </div>
                              <span className="text-[0.7rem] sm:text-xs font-bold tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] uppercase">
                                {listing.status === 'active' ? 'Active' : listing.status === 'pending' ? 'Pending' : 'Sold'}
                              </span>
                              <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="p-5 sm:p-6">
                      <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-2 group-hover:text-amber-700 transition-colors">
                        {listing.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">{listing.locationText}</p>

                      <p className="text-xl sm:text-2xl font-light text-amber-700 mb-3 sm:mb-4">
                        {listing.price}
                      </p>

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
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}

          {!isLoading && filteredListings.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="text-center py-20 px-4"
            >
              {activeFilter === 'active' ? (
                <div className="max-w-2xl mx-auto space-y-4">
                  <p className="text-xl text-gray-800 font-medium">
                    There are no active listings at the moment.
                  </p>
                  <p className="text-base text-gray-600 leading-relaxed">
                    Missy's newest opportunities move quickly, and additional listings will be added here soon. In the meantime, you can still explore the full collection using the filters above.
                  </p>
                </div>
              ) : (
                <p className="text-xl text-gray-600">
                  No listings match your current filter.
                </p>
              )}
            </motion.div>
          )}
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
