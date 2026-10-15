import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SEO from '../components/SEO';
import FooterSection from '../components/sections/FooterSection';
import { luxuryScrollToTop } from '../utils/luxuryScroll';

const LAST_UPDATED = 'October 13, 2026';

type Section = {
  heading: string;
  body?: string;
  list?: string[];
  link?: { to: string; label: string };
};

const sections: Section[] = [
  {
    heading: 'Acceptance of Terms',
    body: 'By accessing or using missydours.com, visitors agree to these Terms of Service. If a visitor does not agree, they should discontinue use of the website.',
  },
  {
    heading: 'Purpose of the Website',
    body: 'The website provides general information about Missy Dours, real estate services, communities, properties, resources, and ways to contact her. Website content is provided for informational purposes and should not be considered legal, tax, lending, investment, appraisal, or other professional advice outside the scope of licensed real estate services.',
  },
  {
    heading: 'No Automatic Agency Relationship',
    body: 'Viewing the website, submitting a contact form, sending an email, or otherwise contacting Missy through the website does not by itself create a broker-client, agency, fiduciary, or representation relationship. Any formal real estate representation relationship must be established separately as required by applicable law and agreement.',
  },
  {
    heading: 'Real Estate Information and Listings',
    body: 'Property listings, prices, availability, market information, photographs, descriptions, measurements, school information, community information, and other real estate data may change without notice. Reasonable efforts may be made to provide accurate information, but no guarantee should be made that all information is complete, current, or error-free. Visitors should independently verify material information before making financial or real estate decisions.',
  },
  {
    heading: 'Fair Housing',
    body: 'Real estate services are provided in accordance with applicable federal, state, and local fair housing and anti-discrimination laws.',
  },
  {
    heading: 'Website Use',
    body: 'Visitors may use the website only for lawful personal and informational purposes. Visitors may not:',
    list: [
      'Interfere with website operation or security',
      'Attempt unauthorized access',
      'Submit fraudulent, abusive, malicious, or automated content',
      'Misuse website forms',
      'Introduce malware or harmful code',
      'Copy or exploit website content in violation of applicable intellectual property rights',
    ],
  },
  {
    heading: 'Intellectual Property',
    body: 'Website design, branding, text, graphics, photographs, logos, and other original materials may be protected by copyright, trademark, or other intellectual property rights belonging to their respective owners. Website access does not transfer ownership rights.',
  },
  {
    heading: 'Third-Party Services and Links',
    body: 'The website may link to or integrate with third-party services, websites, listing platforms, maps, social media, brokerage resources, and other external providers. Those services operate under their own terms and policies. Missy Dours is not responsible for independent third-party websites or services.',
  },
  {
    heading: 'Privacy',
    body: 'Website use is also subject to the Privacy Policy.',
    link: { to: '/privacy', label: 'View Privacy Policy' },
  },
  {
    heading: 'Disclaimer',
    body: 'The website and its content are provided on an "as available" basis to the extent permitted by law. No warranties or guarantees are made regarding uninterrupted operation, availability of listings, accuracy of third-party information, or particular real estate outcomes.',
  },
  {
    heading: 'Limitation of Liability',
    body: 'To the extent permitted by applicable law, Missy Dours and Clancy Realty are not liable for indirect, incidental, consequential, or similar damages arising solely from use of or inability to use the website or reliance on third-party website information.',
  },
  {
    heading: 'Changes to Terms',
    body: 'These Terms may be updated from time to time. The Last Updated date reflects the current version.',
  },
  {
    heading: 'Governing Law',
    body: 'These Terms are governed by applicable laws of the State of Texas and the United States.',
  },
  {
    heading: 'Contact',
    body: 'Missy Dours, Realtor\u00ae with Clancy Realty. For website-related legal or privacy questions, please contact yourcustomerflowguy@gmail.com.',
  },
];

export default function TermsOfServicePage() {
  useEffect(() => {
    luxuryScrollToTop(1400);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
      <SEO
        title="Terms of Service | Missy Dours Real Estate"
        description="Terms of service for missydours.com."
        canonicalPath="/terms"
      />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 sm:pt-36 lg:pt-40 pb-16 sm:pb-20 lg:pb-24">
        <div className="-mt-5 mb-6 sm:mb-8 lg:mb-12">
          <Link
            to="/"
            className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#C4A46A]/70 text-slate-900 shadow-[0_10px_30px_rgba(15,23,42,0.18)] ring-1 ring-[#C4A46A]/60 backdrop-blur-md transition-all duration-300 hover:-translate-y-[1px] hover:shadow-[0_12px_35px_rgba(15,23,42,0.25)] overflow-hidden text-sm sm:text-base font-medium"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/40 via-transparent to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
            <ArrowLeft className="w-4 h-4 relative z-10 transition-transform duration-300 group-hover:-translate-x-1" />
            <span className="relative z-10">Back to Home</span>
          </Link>
        </div>

        <div className="text-center mb-10 sm:mb-12">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl mb-4 sm:mb-6 px-4"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 500,
              letterSpacing: '0.02em',
              background: 'linear-gradient(135deg, #8B7355 0%, #C4A46A 40%, #D4B57A 60%, #8B7355 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 2px 4px rgba(139, 115, 85, 0.1)',
              filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.05))',
            }}
          >
            Terms of Service
          </h1>
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-[#C4A46A] to-transparent mb-4" />
          <p
            className="text-sm sm:text-base"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontWeight: 400,
              color: '#7a7268',
              letterSpacing: '0.02em',
            }}
          >
            Last Updated: {LAST_UPDATED}
          </p>
        </div>

        <div className="bg-white/70 rounded-2xl shadow-[0_4px_24px_rgba(196,164,106,0.10)] ring-1 ring-[#C4A46A]/15 px-6 sm:px-10 lg:px-14 py-8 sm:py-10 lg:py-12">
          <div className="space-y-8 sm:space-y-10">
            {sections.map((section) => (
              <section key={section.heading}>
                <h2
                  className="text-xl sm:text-2xl mb-3 sm:mb-4"
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 600,
                    color: '#3a3530',
                    letterSpacing: '0.01em',
                  }}
                >
                  {section.heading}
                </h2>
                {section.body && (
                  <p
                    className="text-sm sm:text-base leading-[1.7] mb-3"
                    style={{
                      fontFamily: "'Cormorant Garamond', serif",
                      fontWeight: 400,
                      color: '#4a4540',
                      fontSize: '1.0625rem',
                    }}
                  >
                    {section.body}
                  </p>
                )}
                {section.list && (
                  <ul className="space-y-2 ml-1">
                    {section.list.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2.5 text-sm sm:text-base leading-[1.7]"
                        style={{
                          fontFamily: "'Cormorant Garamond', serif",
                          fontWeight: 400,
                          color: '#4a4540',
                          fontSize: '1.0625rem',
                        }}
                      >
                        <span className="mt-2.5 w-1.5 h-1.5 rounded-full bg-[#C4A46A] shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {section.link && (
                  <Link
                    to={section.link.to}
                    className="inline-block text-sm underline text-black hover:text-[#c29f63] transition-colors mt-1"
                  >
                    {section.link.label}
                  </Link>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
