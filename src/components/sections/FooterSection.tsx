import { scrollToSection } from '../../utils/scrollToSection';
import { CONTACT_INFO } from '../../config/contact';

export default function FooterSection() {
  const navLinks = [
    { label: 'Home', target: 'home' },
    { label: 'About', target: 'about' },
    { label: 'Communities', target: 'communities' },
    { label: 'Testimonials', target: 'testimonials' },
    { label: 'Contact', target: 'contact' },
  ];

  return (
    <footer id="footer" className="bg-[#f9f7f3] relative z-10">
      <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          <div className="flex flex-col">
            <button
              type="button"
              onClick={() => scrollToSection('home')}
              className="flex justify-center md:justify-start mb-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c29f63] rounded-lg transition-transform duration-200 hover:scale-105"
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
            <p className="text-sm text-black leading-relaxed mt-2 text-center md:text-left">
              Luxury real estate advisor curating exceptional properties for discerning buyers and sellers across North Texas.
            </p>
            <p className="mt-3 text-xs text-neutral-700 text-center md:text-left">
              License #0844012 · Brokered by Beam Real Estate LLC
            </p>
          </div>

          <div className="flex flex-col">
            <h4 className="text-xs tracking-[0.26em] uppercase text-[#c29f63] mb-3 font-medium">
              Navigate
            </h4>
            <nav className="flex flex-col space-y-3 md:space-y-0 md:flex-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => scrollToSection(link.target)}
                  className="group relative flex items-center text-sm font-medium text-neutral-800 hover:text-[#c29f63] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c29f63] text-left md:flex-1"
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
              <p className="font-medium">Phone: <a href={CONTACT_INFO.phone.tel} className="font-normal text-black hover:text-[#c29f63] underline transition-colors">{CONTACT_INFO.phone.display}</a></p>
              <p className="font-medium">Email: <a href={CONTACT_INFO.email.mailto} className="font-normal text-black hover:text-[#c29f63] underline transition-colors">{CONTACT_INFO.email.display}</a></p>
              <div>
                <p className="font-medium mb-1">Office:</p>
                <a
                  href="https://www.google.com/maps/place/14455+Webb+Chapel+Rd,+Farmers+Branch,+TX+75234"
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

        <div className="border-t border-neutral-300/40 mt-10 pt-6">
          <p className="text-center text-neutral-500 text-xs leading-relaxed">
            © 2025 Missy Dours Real Estate. All Rights Reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
