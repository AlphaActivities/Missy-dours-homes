import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listings } from '../data/listings';
import { Bed, Bath, Maximize, ArrowLeft, Phone, Mail, Expand } from 'lucide-react';
import { CONTACT_INFO } from '../config/contact';
import FooterSection from '../components/sections/FooterSection';
import ImageLightbox from '../components/ui/ImageLightbox';

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const listing = listings.find((l) => l.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  if (!listing) {
    return (
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
    );
  }

  const handleContactClick = () => {
    navigate('/', { state: { scrollTo: 'contact' } });
  };

  const encodedAddress = encodeURIComponent(listing.address);

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-8 sm:pb-12 lg:pb-16">
        {/* Back Link */}
        <div className="-mt-5 mb-6 sm:mb-8 lg:mb-12">
          <Link
            to="/listings"
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
                <div
                  className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-amber-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg z-10 pointer-events-none"
                >
                  ACTIVE LISTING
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
          <div className="space-y-4 sm:space-y-6">
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

        {/* Map Section */}
        <div className="mb-10 sm:mb-12 lg:mb-16">
          <div className="bg-white rounded-xl shadow-md p-5 sm:p-6 lg:p-8">
            <h2 className="text-2xl sm:text-3xl font-light text-gray-900 mb-4 sm:mb-6">Location</h2>
            <div className="aspect-video rounded-lg overflow-hidden">
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
  );
}
