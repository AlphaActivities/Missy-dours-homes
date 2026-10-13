import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FooterSection from '../components/sections/FooterSection';
import { luxuryScrollToTop } from '../utils/luxuryScroll';

const LAST_UPDATED = 'October 13, 2026';

type Section = {
  heading: string;
  body?: string;
  list?: string[];
};

const sections: Section[] = [
  {
    heading: 'Introduction',
    body: 'Missy Dours, Realtor\u00ae with Clancy Realty ("Missy Dours," "we," "us," or "our") respects the privacy of visitors to missydours.com. This Privacy Policy explains the types of information that may be collected through the website, how that information is used, how it may be processed through trusted service providers, and the choices available to visitors.',
  },
  {
    heading: 'Information You Provide',
    body: 'Visitors may voluntarily provide information through website contact or consultation forms. This may include:',
    list: [
      'Name',
      'Email address',
      'Phone number, when provided',
      'Message or inquiry details',
      'Information voluntarily included in communications regarding real estate needs, properties, buying, selling, or related services',
    ],
  },
  {
    heading: 'How Information Is Used',
    body: 'Information submitted through the website may be used to:',
    list: [
      'Respond to inquiries',
      'Communicate about requested real estate services',
      'Understand a visitor\u2019s buying or selling needs',
      'Arrange consultations or follow-up communications',
      'Maintain records relating to inquiries and client relationships',
      'Protect the website from fraudulent, abusive, or automated submissions',
      'Maintain and improve website functionality and customer experience',
    ],
  },
  {
    heading: 'How Information Is Stored and Processed',
    body: 'Information submitted through the website may be privately stored and processed through business systems and trusted technology service providers used to operate the website, manage inquiries, maintain security, and support communications. Reasonable administrative, technical, and organizational safeguards are used to protect submitted information. However, no method of electronic transmission or storage can be guaranteed completely secure.',
  },
  {
    heading: 'Sharing of Personal Information',
    body: 'Missy Dours does not sell personal information. Missy Dours does not share lead or inquiry information with unrelated third parties such as lenders, inspectors, title companies, contractors, or other real estate professionals without the person\u2019s direction or authorization. Information may be processed by trusted technology service providers only as reasonably necessary to operate, secure, analyze, host, maintain, or support the website and related business systems. Information may also be disclosed if required by law, legal process, or to protect legitimate legal or security interests.',
  },
  {
    heading: 'Analytics and Website Usage',
    body: 'The website uses analytics and website-performance technologies to understand how visitors interact with the site and improve functionality and user experience. This may involve technical information such as browser and device information, pages viewed, approximate interaction data, referral information, and actions taken on the website.',
  },
  {
    heading: 'Cookies and Similar Technologies',
    body: 'The website and its service providers may use cookies, browser storage, or similar technologies when necessary for functionality, analytics, security, authentication, or performance. Visitors can generally manage cookies through browser settings, although disabling certain technologies may affect website functionality.',
  },
  {
    heading: 'Bot and Security Protection',
    body: 'The contact form uses automated abuse and bot-protection technology to help prevent spam and fraudulent submissions.',
  },
  {
    heading: 'Google Business Profile and Google API Data',
    body: 'The website may use authorized Google Business Profile API access for the limited purpose of retrieving and displaying information associated with Missy Dours\u2019 authorized Business Profile, including publicly available customer reviews, ratings, reviewer display information, and business responses. Access is authorized by an authorized manager or owner of the applicable Google Business Profile. Google user data obtained through Google APIs is used only for the functionality disclosed above and is not sold, used for unrelated advertising, or shared with unrelated third parties. Where Google API data is temporarily stored or cached for website functionality, it is used only as reasonably necessary to provide the review-display and synchronization functionality. Use and transfer of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use requirements.',
  },
  {
    heading: 'Public Reviews',
    body: 'Information voluntarily posted by customers publicly through third-party review platforms may already be publicly visible and may be displayed on the website where permitted.',
  },
  {
    heading: 'Third-Party Links',
    body: 'The website contains links to external websites and services, including property resources, brokerage resources, social platforms, and other third-party sites. Missy Dours is not responsible for the privacy practices or content of independent third-party websites.',
  },
  {
    heading: 'Data Retention',
    body: 'Information may be retained for as long as reasonably necessary for inquiry management, client communication, legitimate business records, legal obligations, security, and the purposes described in this policy.',
  },
  {
    heading: 'Personal Information Requests',
    body: 'Visitors may request access to, correction of, or deletion of personal information maintained through the website, subject to applicable legal or legitimate recordkeeping requirements. To submit a privacy request, please contact the Website Privacy Contact at yourcustomerflowguy@gmail.com.',
  },
  {
    heading: 'Children\u2019s Privacy',
    body: 'The website is intended for general real estate audiences and is not knowingly designed to collect personal information from children under 13.',
  },
  {
    heading: 'Changes to This Policy',
    body: 'This Privacy Policy may be updated as website technology, services, or legal requirements change. The Last Updated date will reflect revisions.',
  },
  {
    heading: 'Contact',
    body: 'Missy Dours, Realtor\u00ae with Clancy Realty. For privacy questions and requests, please contact yourcustomerflowguy@gmail.com.',
  },
];

export default function PrivacyPolicyPage() {
  useEffect(() => {
    document.title = 'Privacy Policy | Missy Dours Real Estate';
    luxuryScrollToTop(1400);
  }, []);

  return (
    <div className="min-h-screen bg-[#f7f3ea]">
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
            Privacy Policy
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
              </section>
            ))}
          </div>
        </div>
      </div>
      <FooterSection />
    </div>
  );
}
