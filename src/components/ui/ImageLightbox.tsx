import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImageLightboxProps {
  images: string[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  title: string;
}

export default function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  title,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    const handleBodyScroll = () => {
      document.body.style.overflow = 'hidden';
    };

    handleBodyScroll();
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, currentIndex]);

  const handlePrevious = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onNavigate(newIndex);
  };

  const handleNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-sm"
        onClick={handleBackdropClick}
      >
        {/* Close Button */}
        <motion.button
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={onClose}
          className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
          aria-label="Close lightbox"
        >
          <X className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:rotate-90" />
        </motion.button>

        {/* Image Counter */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm sm:text-base font-medium"
        >
          {currentIndex + 1} / {images.length}
        </motion.div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white text-sm sm:text-base font-light max-w-[90%] text-center"
        >
          {title}
        </motion.div>

        {/* Navigation Buttons */}
        {images.length > 1 && (
          <>
            {/* Previous Button */}
            <motion.button
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handlePrevious}
              className="absolute left-2 sm:left-4 lg:left-8 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:-translate-x-1" />
            </motion.button>

            {/* Next Button */}
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              onClick={handleNext}
              className="absolute right-2 sm:right-4 lg:right-8 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:translate-x-1" />
            </motion.button>
          </>
        )}

        {/* Image Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          className="relative w-full h-full flex items-center justify-center px-4 sm:px-16 lg:px-24 py-20 sm:py-24"
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} - Image ${currentIndex + 1}`}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              draggable={false}
            />
          </AnimatePresence>
        </motion.div>

        {/* Thumbnail Strip (Desktop Only) */}
        {images.length > 1 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="hidden lg:flex absolute bottom-20 left-1/2 -translate-x-1/2 z-50 gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md max-w-[90%] overflow-x-auto scrollbar-hide"
          >
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => onNavigate(index)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden transition-all duration-300 ${
                  currentIndex === index
                    ? 'ring-2 ring-white scale-110 opacity-100'
                    : 'opacity-50 hover:opacity-100 hover:scale-105'
                }`}
              >
                <img
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </button>
            ))}
          </motion.div>
        )}

        {/* Swipe Indicators (Mobile) */}
        {images.length > 1 && (
          <div className="lg:hidden absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => onNavigate(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentIndex === index
                    ? 'bg-white w-6'
                    : 'bg-white/40 hover:bg-white/60'
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
