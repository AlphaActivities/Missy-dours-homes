import { GlobalVideoBackground } from './components/ui/GlobalVideoBackground';
import Navbar from './components/Navbar';
import HeroSection from './components/sections/HeroSection';
import FeaturedListings from './components/sections/FeaturedListings';
import MidTierHomesSection from './components/sections/MidTierHomesSection';
import NewToHomeownershipSection from './components/sections/NewToHomeownership';
import AboutSection from './components/sections/AboutSection';
import CommunitiesSection from './components/sections/CommunitiesSection';
import TestimonialsSection from './components/sections/TestimonialsSection';
import ContactSection from './components/sections/ContactSection';
import FooterSection from './components/sections/FooterSection';
import FloatingCallButton from './components/ui/FloatingCallButton';

export default function App() {
  return (
    <>
      <GlobalVideoBackground />
      <Navbar />
      <HeroSection />
      <FeaturedListings />
      <MidTierHomesSection />
      <NewToHomeownershipSection />
      <AboutSection />
      <CommunitiesSection />
      <TestimonialsSection />
      <ContactSection />
      <FooterSection />
      <FloatingCallButton />
    </>
  );
}
