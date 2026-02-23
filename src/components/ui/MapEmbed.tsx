import React from "react";

type MapEmbedProps = {
  address: string;
  className?: string;
  heightClassName?: string;
};

function isBoltPreviewHost(host: string) {
  return (
    host.includes("bolt.new") ||
    host.includes("stackblitz") ||
    host.includes("webcontainer") ||
    host.includes("localhost")
  );
}

export default function MapEmbed({
  address,
  className = "",
  heightClassName = "h-full w-full",
}: MapEmbedProps) {
  const encodedAddress = encodeURIComponent(address || "");
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  const host = typeof window !== "undefined" ? window.location.host : "";
  const isBoltPreview = typeof window !== "undefined" && isBoltPreviewHost(host);

  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  if (isBoltPreview || !apiKey) {
    return (
      <div
        className={
          `${heightClassName} flex items-center justify-center rounded-lg bg-gradient-to-b from-neutral-50 to-neutral-100 text-neutral-700 ` +
          className
        }
      >
        <div className="text-center px-6 max-w-md">
          <div className="text-sm sm:text-base font-semibold mb-2">
            Map preview unavailable here
          </div>
          <div className="text-xs sm:text-sm text-neutral-500 mb-4 leading-relaxed">
            This preview environment blocks some Google embeds. The map will render on the live site
            once the environment variable is set in Netlify.
          </div>
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-neutral-900 text-white text-sm hover:opacity-90 transition"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`;

  return (
    <iframe
      className={`${heightClassName} ${className}`}
      src={src}
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Property Location Map"
    />
  );
}
