import { useNavigate, useLocation } from 'react-router-dom';
import { navigateToSection } from '../../utils/scrollToSection';
import { CONTACT_INFO } from '../../config/contact';
import { Instagram, Linkedin, Home, Facebook } from 'lucide-react';
import { trackPhoneClick, trackEmailClick } from '../../utils/analytics';

export default function FooterSection() {
  const navigate = useNavigate();
  const location = useLocation();
  const navLinks = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Communities', target: 'communities' },
    { label: 'Testimonials', target: 'testimonials' },
    { label: 'Contact', target: 'contact' },
  ];

  return (
    <footer id="footer" className="bg-[#f9f7f3] relative z-10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-8">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => navigateToSection('home', navigate, location.pathname)}
              className="flex justify-center md:justify-start mb-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c29f63] rounded-lg transition-transform duration-200 hover:scale-105"
            >
              <img
                src="/images/md-logo.png"
                alt="Missy Dours Logo"
                className="h-20 w-auto object-contain"
              />
            </button>
            <h3 className="text-sm font-semibold tracking-[0.26em] uppercase text-black leading-tight text-center md:text-left">
              Missy Dours
            </h3>
            <p className="text-sm text-black leading-relaxed mt-1.5 text-center md:text-left">
              Dallas · Fort Worth · Carrollton · Farmers Branch · Addison · Coppell · North Dallas Metroplex · North Texas
            </p>
            <p className="text-sm text-black leading-relaxed mt-1.5 text-center md:text-left">
              Luxury real estate advisor curating exceptional properties for discerning buyers and sellers across North Texas.
            </p>
            <div className="flex items-center justify-center md:justify-start gap-4 mt-2.5">
              <a
                href="https://www.realtor.com/realestateagents/690d57de7abd2208461fc50b"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Realtor.com"
                className="text-black hover:text-[#c29f63] hover:scale-110 transition-all duration-200"
              >
                <Home className="w-7 h-7" strokeWidth={1.5} />
              </a>
              <a
                href="https://www.facebook.com/people/Missy-Dours/61585389652547/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-black hover:text-[#c29f63] hover:scale-110 transition-all duration-200"
              >
                <Facebook className="w-7 h-7" strokeWidth={1.5} />
              </a>
              <a
                href="https://www.instagram.com/werdours/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-black hover:text-[#c29f63] hover:scale-110 transition-all duration-200"
              >
                <Instagram className="w-7 h-7" strokeWidth={1.5} />
              </a>
              <a
                href="https://www.linkedin.com/in/missy-dours-749b30191"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-black hover:text-[#c29f63] hover:scale-110 transition-all duration-200"
              >
                <Linkedin className="w-7 h-7" strokeWidth={1.5} />
              </a>
            </div>
          </div>

          <div className="flex flex-col">
            <h4 className="text-xs tracking-[0.26em] uppercase text-[#c29f63] mb-3 font-medium">
              Navigate
            </h4>
            <nav className="flex flex-col space-y-1.5 md:space-y-0 md:flex-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => navigateToSection(link.target, navigate, location.pathname)}
                  className="group relative flex items-center text-sm font-medium text-neutral-800 hover:text-[#c29f63] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c29f63] text-left py-3 min-h-[44px] md:py-0 md:min-h-0 md:flex-1"
                >
                  <span>{link.label}</span>
                  <span className="pointer-events-none absolute left-0 -bottom-0.5 h-[2px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#e2c88d] via-[#f6e6bf] to-[#c79c4d] transition-transform duration-300 group-hover:scale-x-100" />
                </button>
              ))}
            </nav>
          </div>

          <div className="overflow-hidden">
            <h4 className="text-xs tracking-[0.26em] uppercase text-[#c29f63] mb-3 font-medium">
              Get in touch
            </h4>
            <div className="space-y-3 text-base text-neutral-800/90 animate-[blindsDown_0.8s_ease-out]">
              <p className="font-medium">Phone: <a href={CONTACT_INFO.phone.tel} onClick={() => trackPhoneClick('footer')} className="font-normal text-black hover:text-[#c29f63] underline transition-colors">{CONTACT_INFO.phone.display}</a></p>
              <p className="font-medium">Email: <a href={CONTACT_INFO.email.mailto} onClick={() => trackEmailClick('footer')} className="font-normal text-black hover:text-[#c29f63] underline transition-colors">{CONTACT_INFO.email.display}</a></p>
              <div>
                <p className="font-medium mb-1">Office:</p>
                <a
                  href="https://www.google.com/maps/place/Beam+Mortgage,+Inc./@32.9454615,-96.872839,17z/data=!4m15!1m8!3m7!1s0x864c26f9f70fc909:0x54c7957654502123!2s14455+Webb+Chapel+Rd,+Farmers+Branch,+TX+75234!3b1!8m2!3d32.9454615!4d-96.872839!16s%2Fg%2F11bw3y3q59!3m5!1s0x864c26f9f6230373:0xa34aae587b4aea8e!8m2!3d32.945462!4d-96.872839!16s%2Fg%2F1tctf_vl?entry=ttu&g_ep=EgoyMDI2MDQwMS4wIKXMDSoASAFQAw%3D%3D"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-normal leading-relaxed block text-black hover:text-[#c29f63] no-underline transition-colors"
                >
                  <strong>Beam Real Estate LLC</strong><br />
                  14455 Webb Chapel Road<br />
                  Farmers Branch, Texas 75234
                </a>
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                <a
                  href="/docs/IABS.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-black hover:text-[#c29f63] underline transition-colors"
                >
                  Information About Brokerage Services
                </a>
                <a
                  href="/docs/ConsumerProtectionNotice.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-black hover:text-[#c29f63] underline transition-colors"
                >
                  Consumer Protection Notice
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-neutral-300/40 mt-8 pt-5">
          <p className="text-center text-neutral-500 text-xs leading-relaxed">
            © 2026 Missy Dours Real Estate. All Rights Reserved.
          </p>
          <p className="text-center text-neutral-500 text-xs leading-relaxed mt-1">
            License #0844012 · Brokered by Beam Real Estate LLC
          </p>
        </div>
      </div>
    </footer>
  );
}
