import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface ListingTransitionOverlayProps {
  isVisible: boolean;
  heroImage?: string;
  title?: string;
  price?: string;
  onDismiss: () => void;
}

export default function ListingTransitionOverlay({
  isVisible,
  heroImage,
  title,
  price,
  onDismiss,
}: ListingTransitionOverlayProps) {
  const [shouldDismiss, setShouldDismiss] = useState(false);
  const [mountTime, setMountTime] = useState<number>(0);

  useEffect(() => {
    if (!isVisible) return;

    const mountTimestamp = Date.now();
    setMountTime(mountTimestamp);

    const checkMinimumDuration = (callback: () => void) => {
      const elapsed = Date.now() - mountTimestamp;
      const remaining = Math.max(0, 3200 - elapsed);
      setTimeout(callback, remaining);
    };

    const handleHeroLoaded = () => {
      checkMinimumDuration(() => {
        setShouldDismiss(true);
      });
    };

    window.addEventListener('listingHeroLoaded', handleHeroLoaded);

    const maxDurationTimer = setTimeout(() => {
      setShouldDismiss(true);
      onDismiss();
    }, 4200);

    return () => {
      window.removeEventListener('listingHeroLoaded', handleHeroLoaded);
      clearTimeout(maxDurationTimer);
    };
  }, [isVisible, onDismiss]);

  useEffect(() => {
    if (shouldDismiss) {
      onDismiss();
    }
  }, [shouldDismiss, onDismiss]);

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-slate-800/50 to-slate-900/40 backdrop-blur-xl" />

          <motion.div
            initial={{ scale: 0.96 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative z-10 max-w-md lg:max-w-3xl w-[90%] sm:w-full"
            style={{ willChange: 'transform' }}
          >
            <div className="bg-gradient-to-br from-white/95 to-white/90 backdrop-blur-xl rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-white/40 overflow-hidden">
              <div className="p-8 sm:p-10 lg:p-14 text-center space-y-6">
                <div className="flex justify-center">
                  <img
                    src="/images/md-logo.png"
                    alt="Missy Davis"
                    className="h-16 sm:h-20 lg:h-28 drop-shadow-[0_4px_12px_rgba(196,164,106,0.4)]"
                  />
                </div>

                {heroImage && (
                  <div className="relative rounded-lg overflow-hidden shadow-lg ring-2 ring-[#C4A46A]/30">
                    <img
                      src={heroImage}
                      alt={title || 'Property preview'}
                      className="w-full h-48 sm:h-56 lg:h-80 object-cover"
                      onLoad={() => {
                        const elapsed = Date.now() - mountTime;
                        const remaining = Math.max(0, 3200 - elapsed);
                        setTimeout(() => {
                          setShouldDismiss(true);
                        }, remaining);
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                  </div>
                )}

                <div className="space-y-4">
                  <h2
                    className="text-xl sm:text-2xl lg:text-3xl font-light tracking-wide"
                    style={{
                      fontFamily: "'Playfair Display', serif",
                      background: 'linear-gradient(135deg, #8B7355 0%, #C4A46A 50%, #D4B57A 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Preparing Property Preview
                  </h2>

                  {title && (
                    <div className="pt-2 border-t border-[#C4A46A]/20">
                      <p
                        className="text-base sm:text-lg lg:text-xl font-medium text-slate-800"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                        }}
                      >
                        {title}
                      </p>
                      {price && (
                        <p className="text-sm sm:text-base lg:text-lg text-[#C4A46A] font-semibold mt-1">
                          {price}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex justify-center gap-1.5 pt-2">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{
                        opacity: [0.3, 1, 0.3],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: 'easeInOut',
                      }}
                      className="w-3 h-3 rounded-full bg-gradient-to-r from-[#C4A46A] to-[#D4B57A] shadow-[0_0_8px_rgba(196,164,106,0.4)]"
                    />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
