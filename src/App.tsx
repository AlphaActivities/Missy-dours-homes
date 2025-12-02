import { useState, useEffect } from 'react';
import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import HeroSection from './components/sections/HeroSection';
import ChooseYourPathSection from './components/sections/ChooseYourPathSection';
import FeaturedListings from './components/sections/FeaturedListings';
import MidTierHomesSection from './components/sections/MidTierHomesSection';
import NewToHomeownershipSection from './components/sections/NewToHomeownership';
import AboutSection from './components/sections/AboutSection';
import CommunitiesSection from './components/sections/CommunitiesSection';
import TestimonialsSection from './components/sections/TestimonialsSection';
import ContactSection from './components/sections/ContactSection';
import FooterSection from './components/sections/FooterSection';
import FloatingCallButton from './components/ui/FloatingCallButton';
import { scrollToSection } from './utils/scrollToSection';

export default function App() {
  const [selectedPath, setSelectedPath] = useState<"luxury" | "mid-tier" | "first-time" | null>(null);
  const [pendingScrollTarget, setPendingScrollTarget] = useState<string | null>(null);

  const handleSelectPath = (path: "luxury" | "mid-tier" | "first-time") => {
    setSelectedPath(path);

    const targetId =
      path === "luxury"
        ? "featured-listings"
        : path === "mid-tier"
        ? "mid-tier-homes"
        : "new-to-homeownership";

    setPendingScrollTarget(targetId);
  };

  useEffect(() => {
    if (pendingScrollTarget) {
      setTimeout(() => {
        scrollToSection(pendingScrollTarget);
        setPendingScrollTarget(null);
      }, 100);
    }
  }, [pendingScrollTarget]);

  return (
    <>
      <GlobalVideoBackground />
      <Navbar />
      <HeroSection />
      <ChooseYourPathSection
        selectedPath={selectedPath}
        onSelectPath={handleSelectPath}
      />
      {selectedPath === "luxury" && <FeaturedListings />}
      {selectedPath === "mid-tier" && <MidTierHomesSection />}
      {selectedPath === "first-time" && <NewToHomeownershipSection />}
      <AboutSection />
      <CommunitiesSection />
      <TestimonialsSection />
      <ContactSection />
      <FooterSection />
      <FloatingCallButton />
    </>
  );
}
