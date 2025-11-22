import { scrollToSection } from '../../utils/scrollToSection';

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
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-[#e6c98e]/70 via-[#f5e7c4]/40 to-[#e6c98e]/70"></div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 lg:px-12 py-10 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          <div className="flex flex-col">
            <div className="flex justify-center md:justify-start mb-3">
              <img
                src="/images/md-logo.png"
                alt="Missy Dours Logo"
                className="h-20 w-auto object-contain"
              />
            </div>
            <h3 className="text-sm font-semibold tracking-[0.26em] uppercase text-black leading-tight text-center md:text-left">
              Missy Dours
            </h3>
            <p className="text-xs text-black leading-relaxed mt-1.5 text-center md:text-left">
              Dallas · Fort Worth · Carrollton · Farmers Branch · Addison · Coppell · North Dallas Metroplex · North Texas
            </p>
            <p className="text-xs text-black leading-relaxed mt-2 text-center md:text-left">
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
            <nav className="flex flex-col space-y-3 md:space-y-0 md:justify-between md:flex-1">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => scrollToSection(link.target)}
                  className="group relative inline-flex w-fit text-sm font-medium text-neutral-800 hover:text-[#c29f63] transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#c29f63] text-left"
                >
                  <span>{link.label}</span>
                  <span className="pointer-events-none absolute left-0 -bottom-0.5 h-[1px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#e2c88d] to-[#c79c4d] opacity-60 transition-transform duration-200 group-hover:scale-x-100" />
                </button>
              ))}
            </nav>
          </div>

          <div className="overflow-hidden">
            <h4 className="text-xs tracking-[0.26em] uppercase text-[#c29f63] mb-3 font-medium">
              Get in touch
            </h4>
            <div className="space-y-3 text-base text-neutral-800/90 animate-[blindsDown_0.8s_ease-out]">
              <p className="font-medium">Phone: <span className="font-normal">214-861-0665</span></p>
              <p className="font-medium">Email: <span className="font-normal">missydourshomes@gmail.com</span></p>
              <p className="font-medium">Office:</p>
              <p className="font-normal leading-relaxed">
                Beam Real Estate LLC<br />
                14455 Webb Chapel Road<br />
                Farmers Branch, Texas 75234
              </p>
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
