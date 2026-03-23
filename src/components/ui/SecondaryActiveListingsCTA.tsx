import { useNavigate } from 'react-router-dom';
import { Home } from 'lucide-react';

type Tier = "luxury" | "mid" | "first";

interface SecondaryActiveListingsCTAProps {
  tier: Tier;
}

const tierConfig: Record<Tier, { text: string; filter: string }> = {
  luxury: { text: "View Luxury Listings", filter: "luxury" },
  mid: { text: "View Mid-Tier Listings", filter: "mid" },
  first: { text: "View First-Time Listings", filter: "first" },
};

export default function SecondaryActiveListingsCTA({ tier }: SecondaryActiveListingsCTAProps) {
  const navigate = useNavigate();
  const config = tierConfig[tier];

  const handleClick = () => {
    navigate(`/listings?filter=${config.filter}`);
  };

  return (
    <div className="flex justify-center mt-12">
      <button
        type="button"
        onClick={handleClick}
        className="relative overflow-hidden inline-flex items-center gap-2 border-2 border-[#C4A46A] text-white hover:bg-gradient-to-br hover:from-[#8B6F47]/40 hover:to-[#6B5335]/30 rounded-full px-7 py-3 shadow-[0_0_20px_rgba(196,164,106,0.4)] hover:shadow-[0_0_35px_rgba(196,164,106,0.7)] transition-all duration-300 cursor-pointer transform hover:scale-105"
        style={{ isolation: 'isolate' }}
      >
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(246,230,191,0.2) 0%, rgba(226,200,141,0.12) 40%, rgba(196,164,106,0.05) 70%, rgba(196,164,106,0) 100%)',
            animation: 'luxGoldSheen 5s ease-in-out infinite',
            boxShadow: 'inset 0 0 20px rgba(246,230,191,0.15), inset 0 0 35px rgba(226,200,141,0.08)',
          }}
        />
        <span
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(196,164,106,0) 0%, rgba(196,164,106,0.15) 15%, rgba(226,200,141,0.3) 35%, rgba(246,230,191,0.5) 45%, rgba(231,212,168,0.5) 50%, rgba(246,230,191,0.5) 55%, rgba(226,200,141,0.3) 65%, rgba(196,164,106,0.15) 85%, rgba(196,164,106,0) 100%)',
            width: '80px',
            height: '200%',
            top: '-50%',
            left: '-120px',
            transform: 'rotate(20deg)',
            animation: 'luxGoldBorderTravel 6s ease-in-out infinite',
            filter: 'blur(2px)',
            boxShadow: '0 0 15px rgba(246,230,191,0.3), 0 0 30px rgba(226,200,141,0.2)',
          }}
        />
        <Home className="w-4 h-4 relative z-10" />
        <span className="relative z-10 font-medium">{config.text}</span>
      </button>
    </div>
  );
}
