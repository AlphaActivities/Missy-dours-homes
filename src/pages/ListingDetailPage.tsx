import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { listings } from '../data/listings';
import { Bed, Bath, Maximize, ArrowLeft, Phone, Mail } from 'lucide-react';
import { CONTACT_INFO } from '../config/contact';

export default function ListingDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const listing = listings.find((l) => l.slug === slug);

  const [selectedImage, setSelectedImage] = useState(0);

  if (!listing) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/30 flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-amber-50/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-8 sm:pb-12 lg:pb-16">
        {/* Back Link */}
        <Link
          to="/listings"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-amber-700 mb-6 sm:mb-8 transition-colors text-sm sm:text-base"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Listings</span>
        </Link>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 mb-12 sm:mb-16">
          {/* Left: Gallery */}
          <div className="space-y-3 sm:space-y-4">
            {/* Main Image */}
            <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-lg">
              <img
                src={listing.galleryImages[selectedImage]}
                alt={`${listing.title} - Image ${selectedImage + 1}`}
                className="w-full h-full object-cover"
              />
              {listing.status === 'active' && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-amber-600 text-white px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-lg">
                  ACTIVE LISTING
                </div>
              )}
            </div>

            {/* Thumbnail Grid */}
            {listing.galleryImages.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {listing.galleryImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square rounded-md sm:rounded-lg overflow-hidden transition-all ${
                      selectedImage === index
                        ? 'ring-2 ring-amber-600 opacity-100'
                        : 'opacity-60 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
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
    </div>
  );
}
