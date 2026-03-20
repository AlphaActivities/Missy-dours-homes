import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useNavbarHeight } from '../../hooks/useNavbarHeight';

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
  const [introComplete, setIntroComplete] = useState(false);
  const { navbarHeight, isReady } = useNavbarHeight();

  useEffect(() => {
    if (!isVisible) return;

    const mountTimestamp = Date.now();
    setMountTime(mountTimestamp);

    const introCompleteTimer = setTimeout(() => {
      setIntroComplete(true);
    }, 250);

    const maxDurationTimer = setTimeout(() => {
      setShouldDismiss(true);
      onDismiss();
    }, 3200);

    return () => {
      clearTimeout(introCompleteTimer);
      clearTimeout(maxDurationTimer);
      setIntroComplete(false);
    };
  }, [isVisible, onDismiss]);

  useEffect(() => {
    if (shouldDismiss) {
      onDismiss();
    }
  }, [shouldDismiss, onDismiss]);

  const paddingTop = isReady ? navbarHeight + 8 : 128;

  return (
    <AnimatePresence mode="wait">
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="fixed inset-0 z-40 bg-[#f7f3ea]"
          style={{ paddingTop: `${paddingTop}px` }}
        >
          <div className="min-h-full flex items-start sm:items-center justify-center px-4 pt-8 sm:pt-0">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="w-full max-w-md lg:max-w-3xl"
            >
            <div className="bg-gradient-to-br from-[#FFFBF5] to-[#FFF9F0] rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.6)] border border-[#C4A46A]/20 overflow-hidden">
              <div className="p-8 sm:p-10 lg:p-14 text-center space-y-6">
                <div className="flex justify-center">
                  <img
                    src="/images/md-logo.png"
                    alt="Missy Davis"
                    loading="eager"
                    decoding="sync"
                    className="h-16 sm:h-20 lg:h-28 drop-shadow-[0_4px_12px_rgba(196,164,106,0.4)]"
                  />
                </div>

                {heroImage && (
                  <div className="relative rounded-lg overflow-hidden ring-2 ring-[#C4A46A]/30">
                    <img
                      src={heroImage}
                      alt={title || 'Property preview'}
                      loading="eager"
                      decoding="sync"
                      className="w-full h-48 sm:h-56 lg:h-80 object-cover"
                      onLoad={() => {
                        if (!introComplete) return;
                        const elapsed = Date.now() - (mountTime + 250);
                        const remaining = Math.max(0, 2200 - elapsed);
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
                        className="text-base sm:text-lg lg:text-xl font-semibold text-slate-800"
                        style={{
                          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
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

                <div className="flex justify-center pt-2">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                    className="relative w-12 h-12"
                  >
                    <div
                      className="w-12 h-12 rounded-full animate-spin"
                      style={{
                        background: 'conic-gradient(from 0deg, transparent 0%, rgba(196, 164, 106, 0.000) 1%, rgba(196, 164, 106, 0.001) 2%, rgba(196, 164, 106, 0.003) 3%, rgba(196, 164, 106, 0.008) 4%, rgba(196, 164, 106, 0.014) 5%, rgba(196, 164, 106, 0.023) 6%, rgba(196, 164, 106, 0.035) 7%, rgba(196, 164, 106, 0.051) 8%, rgba(196, 164, 106, 0.070) 9%, rgba(196, 164, 106, 0.094) 10%, rgba(196, 164, 106, 0.122) 11%, rgba(196, 164, 106, 0.154) 12%, rgba(196, 164, 106, 0.192) 13%, rgba(196, 164, 106, 0.234) 14%, rgba(196, 164, 106, 0.281) 15%, rgba(196, 164, 106, 0.333) 16%, rgba(196, 164, 106, 0.389) 17%, rgba(196, 164, 106, 0.450) 18%, rgba(196, 164, 106, 0.515) 19%, rgba(196, 164, 106, 0.584) 20%, rgba(196, 164, 106, 0.656) 21%, rgba(196, 164, 106, 0.730) 22%, rgba(196, 164, 106, 0.806) 23%, rgba(196, 164, 106, 0.882) 24%, rgba(196, 164, 106, 0.957) 25%, rgba(196, 164, 106, 1.000) 26%, rgba(196, 164, 106, 1.000) 27%, rgba(196, 164, 106, 1.000) 28%, rgba(196, 164, 106, 1.000) 29%, rgba(196, 164, 106, 1.000) 30%, rgba(196, 164, 106, 1.000) 31%, rgba(196, 164, 106, 1.000) 32%, rgba(196, 164, 106, 1.000) 33%, rgba(196, 164, 106, 1.000) 34%, rgba(196, 164, 106, 1.000) 35%, rgba(196, 164, 106, 1.000) 36%, rgba(196, 164, 106, 1.000) 37%, rgba(196, 164, 106, 1.000) 38%, rgba(196, 164, 106, 1.000) 39%, rgba(196, 164, 106, 1.000) 40%, rgba(196, 164, 106, 1.000) 41%, rgba(196, 164, 106, 1.000) 42%, rgba(196, 164, 106, 1.000) 43%, rgba(196, 164, 106, 1.000) 44%, rgba(196, 164, 106, 1.000) 45%, rgba(196, 164, 106, 1.000) 46%, rgba(196, 164, 106, 1.000) 47%, rgba(196, 164, 106, 1.000) 48%, rgba(196, 164, 106, 1.000) 49%, rgba(196, 164, 106, 1.000) 50%, rgba(196, 164, 106, 0.957) 51%, rgba(196, 164, 106, 0.882) 52%, rgba(196, 164, 106, 0.806) 53%, rgba(196, 164, 106, 0.730) 54%, rgba(196, 164, 106, 0.656) 55%, rgba(196, 164, 106, 0.584) 56%, rgba(196, 164, 106, 0.515) 57%, rgba(196, 164, 106, 0.450) 58%, rgba(196, 164, 106, 0.389) 59%, rgba(196, 164, 106, 0.333) 60%, rgba(196, 164, 106, 0.281) 61%, rgba(196, 164, 106, 0.234) 62%, rgba(196, 164, 106, 0.192) 63%, rgba(196, 164, 106, 0.154) 64%, rgba(196, 164, 106, 0.122) 65%, rgba(196, 164, 106, 0.094) 66%, rgba(196, 164, 106, 0.070) 67%, rgba(196, 164, 106, 0.051) 68%, rgba(196, 164, 106, 0.035) 69%, rgba(196, 164, 106, 0.023) 70%, rgba(196, 164, 106, 0.014) 71%, rgba(196, 164, 106, 0.008) 72%, rgba(196, 164, 106, 0.003) 73%, rgba(196, 164, 106, 0.001) 74%, rgba(196, 164, 106, 0.000) 75%, transparent 76%, transparent 100%)',
                        WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 2px))',
                        mask: 'radial-gradient(farthest-side, transparent calc(100% - 4px), black calc(100% - 2px))',
                      }}
                    />
                  </motion.div>
                </div>
              </div>
            </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
