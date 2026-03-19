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
          <div className="min-h-full flex items-center justify-center px-4">
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
                        background: 'conic-gradient(from 0deg, transparent 0%, rgba(196, 164, 106, 0.01) 1%, rgba(196, 164, 106, 0.016) 2%, rgba(196, 164, 106, 0.027) 3%, rgba(196, 164, 106, 0.04) 4%, rgba(196, 164, 106, 0.058) 5%, rgba(196, 164, 106, 0.078) 6%, rgba(196, 164, 106, 0.102) 7%, rgba(196, 164, 106, 0.13) 8%, rgba(196, 164, 106, 0.16) 9%, rgba(196, 164, 106, 0.195) 10%, rgba(196, 164, 106, 0.233) 11%, rgba(196, 164, 106, 0.274) 12%, rgba(196, 164, 106, 0.32) 13%, rgba(196, 164, 106, 0.368) 14%, rgba(196, 164, 106, 0.42) 15%, rgba(196, 164, 106, 0.475) 16%, rgba(196, 164, 106, 0.534) 17%, rgba(196, 164, 106, 0.596) 18%, rgba(196, 164, 106, 0.66) 19%, rgba(196, 164, 106, 0.728) 20%, rgba(196, 164, 106, 0.798) 21%, rgba(196, 164, 106, 0.872) 22%, rgba(196, 164, 106, 0.948) 23%, rgba(196, 164, 106, 1) 24%, rgba(198, 166, 108, 1) 25%, rgba(200, 168, 109, 1) 26%, rgba(202, 170, 110, 1) 27%, rgba(204, 172, 112, 1) 28%, rgba(206, 174, 114, 1) 29%, rgba(208, 176, 115, 1) 30%, rgba(210, 179, 119, 1) 32%, rgba(212, 181, 122, 1) 34%, rgba(214, 184, 126, 1) 36%, rgba(215, 185, 128, 1) 38%, rgba(214, 184, 126, 1) 40%, rgba(212, 181, 122, 1) 42%, rgba(210, 179, 119, 1) 44%, rgba(208, 176, 115, 1) 46%, rgba(206, 174, 114, 1) 47%, rgba(204, 172, 112, 1) 48%, rgba(202, 170, 110, 1) 49%, rgba(200, 168, 109, 1) 50%, rgba(198, 166, 108, 1) 51%, rgba(196, 164, 106, 1) 52%, rgba(196, 164, 106, 0.948) 53%, rgba(196, 164, 106, 0.872) 54%, rgba(196, 164, 106, 0.798) 55%, rgba(196, 164, 106, 0.728) 56%, rgba(196, 164, 106, 0.66) 57%, rgba(196, 164, 106, 0.596) 58%, rgba(196, 164, 106, 0.534) 59%, rgba(196, 164, 106, 0.475) 60%, rgba(196, 164, 106, 0.42) 61%, rgba(196, 164, 106, 0.368) 62%, rgba(196, 164, 106, 0.32) 63%, rgba(196, 164, 106, 0.274) 64%, rgba(196, 164, 106, 0.233) 65%, rgba(196, 164, 106, 0.195) 66%, rgba(196, 164, 106, 0.16) 67%, rgba(196, 164, 106, 0.13) 68%, rgba(196, 164, 106, 0.102) 69%, rgba(196, 164, 106, 0.078) 70%, rgba(196, 164, 106, 0.058) 71%, rgba(196, 164, 106, 0.04) 72%, rgba(196, 164, 106, 0.027) 73%, rgba(196, 164, 106, 0.016) 74%, rgba(196, 164, 106, 0.01) 75%, transparent 76%, transparent 100%)',
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
