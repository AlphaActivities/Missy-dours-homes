import { useEffect, useState, useRef } from 'react';
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
  const [showControls, setShowControls] = useState(true);
  const [isSwiping, setIsSwiping] = useState(false);
  const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });
  const touchCurrentRef = useRef({ x: 0, y: 0 });
  const mouseStartRef = useRef({ x: 0, y: 0, time: 0 });
  const isDraggingRef = useRef(false);

  const resetHideControlsTimer = () => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    hideControlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 2000);
  };

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

    resetHideControlsTimer();

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isOpen, currentIndex]);

  const handlePrevious = () => {
    setSlideDirection('right');
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    onNavigate(newIndex);
    resetHideControlsTimer();
  };

  const handleNext = () => {
    setSlideDirection('left');
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1;
    onNavigate(newIndex);
    resetHideControlsTimer();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchCurrentRef.current = { x: touch.clientX, y: touch.clientY };

    const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

    if (deltaX > 10 || deltaY > 10) {
      setIsSwiping(true);
      setShowControls(false);
    }
  };

  const handleTouchEnd = () => {
    const deltaX = touchCurrentRef.current.x - touchStartRef.current.x;
    const deltaY = Math.abs(touchCurrentRef.current.y - touchStartRef.current.y);
    const deltaTime = Date.now() - touchStartRef.current.time;

    const isSwipe = Math.abs(deltaX) > 50 && deltaY < 100 && deltaTime < 300;

    if (isSwipe) {
      if (deltaX > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }

    setIsSwiping(false);
    resetHideControlsTimer();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    isDraggingRef.current = true;
    mouseStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDraggingRef.current) {
      const deltaX = Math.abs(e.clientX - mouseStartRef.current.x);
      const deltaY = Math.abs(e.clientY - mouseStartRef.current.y);

      if (deltaX > 10 || deltaY > 10) {
        setIsSwiping(true);
        setShowControls(false);
      }
    } else if (!isSwiping) {
      resetHideControlsTimer();
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;

    const deltaX = e.clientX - mouseStartRef.current.x;
    const deltaY = Math.abs(e.clientY - mouseStartRef.current.y);
    const deltaTime = Date.now() - mouseStartRef.current.time;

    const isSwipe = Math.abs(deltaX) > 50 && deltaY < 100 && deltaTime < 500;

    if (isSwipe) {
      if (deltaX > 0) {
        handlePrevious();
      } else {
        handleNext();
      }
    }

    setIsSwiping(false);
    resetHideControlsTimer();
  };

  const handleMouseLeave = () => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsSwiping(false);
      resetHideControlsTimer();
    }
  };

  const handleImageClick = () => {
    if (!isSwiping) {
      resetHideControlsTimer();
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
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Close Button */}
        <AnimatePresence>
          {showControls && (
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 p-2 sm:p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
              aria-label="Close lightbox"
            >
              <X className="w-6 h-6 sm:w-7 sm:h-7 transition-transform duration-300 group-hover:rotate-90" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Image Counter */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="absolute top-4 left-4 sm:top-6 sm:left-6 z-50 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-sm sm:text-base font-medium"
            >
              {currentIndex + 1} / {images.length}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full bg-white/10 backdrop-blur-md text-white text-sm sm:text-base font-light max-w-[90%] text-center"
            >
              {title}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Buttons - Desktop/Tablet (centered vertically) */}
        <AnimatePresence>
          {images.length > 1 && showControls && !isSwiping && (
            <>
              {/* Previous Button - Desktop/Tablet */}
              <motion.button
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                onClick={handlePrevious}
                className="hidden sm:block absolute left-2 sm:left-4 lg:left-8 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:-translate-x-1" />
              </motion.button>

              {/* Next Button - Desktop/Tablet */}
              <motion.button
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onClick={handleNext}
                className="hidden sm:block absolute right-2 sm:right-4 lg:right-8 top-1/2 -translate-y-1/2 z-50 p-3 sm:p-4 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 hover:scale-110 group"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
            </>
          )}
        </AnimatePresence>

        {/* Navigation Buttons - Mobile (below image) */}
        <AnimatePresence>
          {images.length > 1 && showControls && !isSwiping && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="sm:hidden absolute bottom-32 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4"
            >
              <button
                onClick={handlePrevious}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 active:scale-95"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={handleNext}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all duration-300 active:scale-95"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
          className="relative w-full h-full flex items-center justify-center px-4 sm:px-16 lg:px-24 py-20 sm:py-24"
          onClick={handleImageClick}
        >
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.img
              key={currentIndex}
              src={images[currentIndex]}
              alt={`${title} - Image ${currentIndex + 1}`}
              custom={slideDirection}
              initial={(direction) => ({
                opacity: 0,
                x: direction === 'left' ? 300 : direction === 'right' ? -300 : 0,
              })}
              animate={{
                opacity: 1,
                x: 0,
              }}
              exit={(direction) => ({
                opacity: 0,
                x: direction === 'left' ? -300 : direction === 'right' ? 300 : 0,
              })}
              transition={{ duration: 0.4, ease: 'easeInOut' }}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none"
              draggable={false}
              onAnimationComplete={() => setSlideDirection(null)}
            />
          </AnimatePresence>
        </motion.div>

        {/* Thumbnail Strip (Desktop Only) */}
        <AnimatePresence>
          {images.length > 1 && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="hidden lg:flex absolute bottom-20 left-1/2 -translate-x-1/2 z-50 gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md max-w-[90%] overflow-x-auto scrollbar-hide"
            >
              {images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onNavigate(index);
                    resetHideControlsTimer();
                  }}
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
        </AnimatePresence>

        {/* Swipe Indicators (Mobile) */}
        <AnimatePresence>
          {images.length > 1 && showControls && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              className="lg:hidden absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-1.5"
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onNavigate(index);
                    resetHideControlsTimer();
                  }}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    currentIndex === index
                      ? 'bg-white w-6'
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`Go to image ${index + 1}`}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
