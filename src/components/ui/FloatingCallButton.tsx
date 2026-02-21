import { Phone } from 'lucide-react';
import { CONTACT_INFO } from '../../config/contact';

export default function FloatingCallButton() {
  return (
    <a
      href={CONTACT_INFO.phone.tel}
      aria-label="Call Missy Dours"
      className="md:hidden fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-[#e6c98e] to-[#c29f63] shadow-[0_10px_40px_rgba(194,159,99,0.5)] hover:shadow-[0_15px_50px_rgba(194,159,99,0.7)] transition-all duration-300 hover:scale-110 active:scale-95"
    >
      <Phone className="w-7 h-7 text-black" strokeWidth={2.5} />
    </a>
  );
}
