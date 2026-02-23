import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useSearchParams, useLocation } from 'react-router-dom';
import { listings } from '../data/listings';
import { Bed, Bath, Maximize, ArrowLeft, Phone, Mail, Expand, Home, ChevronDown } from 'lucide-react';
import { CONTACT_INFO } from '../config/contact';
import FooterSection from '../components/sections/FooterSection';
import ImageLightbox from '../components/ui/ImageLightbox';
import { PageTransition } from '../components/ui/PageTransition';

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const fromFilter = searchParams.get('from') || 'all';
  const listing = listings.find((l) => l.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [openFeatureSections, setOpenFeatureSections] = useState<string[]>([]);

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'instant',
    });
  }, [location.pathname]);

  if (!listing) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-[#f7f3ea] flex items-center justify-center px-6">
          <div className="text-center">
            <h1 className="text-4xl font-light text-gray-900 mb-4">Listing Not Found</h1>
            <p className="text-gray-600 mb-8">The property you're looking for doesn't exist or has been removed.</p>
            <button
              onClick={() => navigate('/listings')}
              className="px-8 py-3 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Back to Listings
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  const handleContactClick = () => {
    navigate('/', { state: { scrollTo: 'contact' } });
  };

  const toggleFeatureSection = (sectionName: string) => {
    setOpenFeatureSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((name) => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const encodedAddress = encodeURIComponent(listing.address);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#f7f3ea]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-8 sm:pb-12 lg:pb-16">
        {/* Back Link */}
        <div className="-mt-5 mb-6 sm:mb-8 lg:mb-12">
          <Link
            to={`/listings?filter=${fromFilter}`}
            className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C4A46A]/70 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.18)] ring-1 ring-[#C4A46A]/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_35px_rgba(15,23,42,0.25)] overflow-hidden text-sm sm:text-base font-medium"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            <ArrowLeft className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="relative z-10">Back to Listings</span>
          </Link>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 sm:mb-16">
          {/* Left: Gallery */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main Image */}
            <div
              className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg group cursor-pointer"
              onClick={() => setIsLightboxOpen(true)}
            >
              <img
                src={listing.galleryImages[selectedImage]}
                alt={`${listing.title} - Image ${selectedImage + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {listing.status === 'active' && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 group/badge pointer-events-none z-10">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-600 to-orange-600 rounded-full blur-md opacity-75 animate-pulse" />
                    <div className="relative flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 rounded-full shadow-[0_4px_20px_rgba(217,119,6,0.5)] border border-amber-400/50 backdrop-blur-sm">
                      <div className="relative">
                        <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" strokeWidth={2.5} />
                        <div className="absolute inset-0 animate-ping opacity-30">
                          <Home className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" strokeWidth={2.5} />
                        </div>
                      </div>
                      <span className="text-[0.7rem] sm:text-xs font-bold tracking-wider text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] uppercase">
                        Active
                      </span>
                      <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/20 to-transparent opacity-0 group-hover/badge:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
                </div>
              )}
              {/* Fullscreen Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLightboxOpen(true);
                }}
                className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 p-2 sm:p-3 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-sm transition-all duration-300 opacity-0 group-hover:opacity-100 hover:scale-110 z-10"
                aria-label="View fullscreen"
              >
                <Expand className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              {/* Click to Expand Hint */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/20 backdrop-blur-[2px] pointer-events-none">
                <div className="px-4 py-2 rounded-full bg-black/60 text-white text-sm font-medium backdrop-blur-md">
                  Click to view fullscreen
                </div>
              </div>
            </div>

            {/* Thumbnail Grid */}
            {listing.galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {listing.galleryImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-md sm:rounded-lg overflow-hidden transition-all group/thumb ${
                      selectedImage === index
                        ? 'ring-2 ring-amber-600 opacity-100'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover/thumb:scale-110"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Details Card */}
          <div className="space-y-4 sm:space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-light text-gray-900 mb-2">{listing.title}</h1>
              <p className="text-base sm:text-lg text-gray-600 mb-4 sm:mb-6">{listing.locationText}</p>

              <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-amber-700 mb-6 sm:mb-8">{listing.price}</p>

              {/* Property Stats */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                <div className="flex items-center gap-2 text-gray-700">
                  <Bed className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-lg font-medium">{listing.beds}</span>
                  <span className="text-xs sm:text-sm text-gray-600">Beds</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Bath className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-lg font-medium">{listing.baths}</span>
                  <span className="text-xs sm:text-sm text-gray-600">Baths</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Maximize className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="text-base sm:text-lg font-medium">{listing.sqft.toLocaleString()}</span>
                  <span className="text-xs sm:text-sm text-gray-600">Sqft</span>
                </div>
              </div>

              {/* Listing Snapshot */}
              {(listing.propertyType || listing.yearBuilt || listing.lotSize || listing.mlsNumber || listing.lastUpdated || listing.daysOnline) && (
                <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-200">
                  <h3 className="text-lg sm:text-xl font-medium text-gray-900 mb-4">Property Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {listing.propertyType && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Property Type</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.propertyType}</p>
                      </div>
                    )}
                    {listing.yearBuilt && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Year Built</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.yearBuilt}</p>
                      </div>
                    )}
                    {listing.lotSize && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Lot Size</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.lotSize}</p>
                      </div>
                    )}
                    {listing.mlsNumber && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">MLS #</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.mlsNumber}</p>
                      </div>
                    )}
                    {listing.lastUpdated && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Last Updated</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.lastUpdated}</p>
                      </div>
                    )}
                    {listing.daysOnline !== undefined && (
                      <div>
                        <p className="text-xs sm:text-sm text-gray-500 mb-1">Days Online</p>
                        <p className="text-sm sm:text-base text-gray-900 font-medium">{listing.daysOnline}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* CTA Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleContactClick}
                  className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-all text-base sm:text-lg font-medium shadow-lg shadow-amber-600/30 hover:shadow-xl"
                >
                  Contact Missy
                </button>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <a
                    href={CONTACT_INFO.phone.tel}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-amber-600 hover:text-amber-700 transition-all text-sm sm:text-base"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Call</span>
                  </a>
                  <a
                    href={CONTACT_INFO.email.mailto}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-white text-gray-700 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-amber-600 hover:text-amber-700 transition-all text-sm sm:text-base"
                  >
                    <Mail className="w-4 h-4" />
                    <span>Email</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="mb-10 sm:mb-12 lg:mb-16">
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
            <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4 sm:mb-6">About This Property</h2>
            <p className="text-base sm:text-lg text-gray-700 leading-relaxed">{listing.description}</p>
          </div>
        </div>

        {/* Highlights Section */}
        {listing.highlights && listing.highlights.length > 0 && (
          <div className="mb-10 sm:mb-12 lg:mb-16">
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4 sm:mb-6">Property Highlights</h2>
              <ul className="space-y-3">
                {listing.highlights.map((highlight, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                    <span className="text-base sm:text-lg text-gray-700 leading-relaxed">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Features Accordion */}
        {listing.features && Object.keys(listing.features).length > 0 && (
          <div className="mb-10 sm:mb-12 lg:mb-16">
            <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
              <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4 sm:mb-6">Features & Details</h2>
              <div className="space-y-3">
                {Object.entries(listing.features).map(([category, items]) => {
                  const isOpen = openFeatureSections.includes(category);
                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleFeatureSection(category)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                      >
                        <span className="text-base sm:text-lg font-medium text-gray-900">{category}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${
                          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                        }`}
                      >
                        <div className="p-4 pt-0 border-t border-gray-100">
                          <ul className="space-y-2">
                            {items.map((item, index) => (
                              <li key={index} className="flex items-start gap-3">
                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                                <span className="text-sm sm:text-base text-gray-700">{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Map Section */}
        <div className="mb-10 sm:mb-12 lg:mb-16">
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
            <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4 sm:mb-6">Location</h2>
            <div className="aspect-video lg:aspect-auto lg:h-[500px] rounded-lg overflow-hidden">
              <iframe
                src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${encodedAddress}`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property Location Map"
              />
            </div>
          </div>
        </div>
      </div>
      <FooterSection />

      {/* Image Lightbox */}
      <ImageLightbox
        images={listing.galleryImages}
        currentIndex={selectedImage}
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        onNavigate={(index) => setSelectedImage(index)}
        title={listing.title}
      />
      </div>
    </PageTransition>
  );
}
