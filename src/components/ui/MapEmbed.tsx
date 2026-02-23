import React from "react";

type MapEmbedProps = {
  address: string;
  className?: string;
};

function isBoltPreviewHost(host: string) {
  return (
    host.includes("bolt.new") ||
    host.includes("stackblitz") ||
    host.includes("webcontainer") ||
    host.includes("localhost") === false && host.includes("preview")
  );
}

export default function MapEmbed({ address, className = "" }: MapEmbedProps) {
  const encodedAddress = encodeURIComponent(address);
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  const host = typeof window !== "undefined" ? window.location.host : "";
  const isBoltPreview = typeof window !== "undefined" && isBoltPreviewHost(host);

  // NOTE:
  // Bolt preview often runs with COEP enabled, which can block Google Maps iframes via CORP.
  // So we show a clean fallback UI inside Bolt preview so you can still style the section.

  if (isBoltPreview) {
    return (
      <div
        className={
          "h-full w-full flex items-center justify-center bg-gray-100 text-gray-700 " +
          className
        }
      >
        <div className="text-center px-6">
          <div className="text-sm sm:text-base font-medium mb-2">
            Map preview blocked in Bolt sandbox
          </div>
          <div className="text-xs sm:text-sm text-gray-500 mb-4">
            This is caused by cross-origin embed restrictions in the preview environment, not your API key.
          </div>
          <a
            href={mapsLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-lg px-4 py-2 bg-black text-white text-sm hover:opacity-90 transition"
          >
            Open in Google Maps
          </a>
        </div>
      </div>
    );
  }

  const apiKey = "AIzaSyAbdS3vxczrB0SAVeyyunYs8RSsEZPK06g";
  const src = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}`;

  return (
    <iframe
      className={"h-full w-full " + className}
      src={src}
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
      title="Property Location Map"
    />
  );
}
