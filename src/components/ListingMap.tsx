import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";

import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

type ListingMapProps = {
  lat?: number;
  lng?: number;
  title?: string;
  address?: string;
  className?: string;
};

export default function ListingMap({
  lat,
  lng,
  title,
  address,
  className,
}: ListingMapProps) {
  const hasCoords = typeof lat === "number" && typeof lng === "number";

  const position = useMemo<[number, number] | null>(() => {
    if (!hasCoords) return null;
    return [lat as number, lng as number];
  }, [hasCoords, lat, lng]);

  useMemo(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
    return null;
  }, []);

  if (!position) {
    const q = encodeURIComponent(address || title || "");
    return (
      <div className={`rounded-2xl border border-white/10 bg-black/30 p-6 ${className || ""}`}>
        <div className="text-sm text-white/80 mb-2">Map Preview</div>
        <div className="text-sm text-white/60 mb-4">
          This listing doesn't have coordinates set yet.
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-white/10 hover:bg-white/15 text-white transition"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl overflow-hidden border border-white/10 ${className || ""}`}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: 320, width: "100%" }}
        attributionControl={true}
      >
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <Marker position={position}>
          <Popup>
            <div style={{ fontWeight: 600 }}>{title || "Listing location"}</div>
            {address ? <div style={{ opacity: 0.8 }}>{address}</div> : null}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
