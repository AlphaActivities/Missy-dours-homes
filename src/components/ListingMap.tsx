import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from "react-leaflet";
import L from "leaflet";
import { MapPin, ExternalLink } from "lucide-react";

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
      <div className={`rounded-2xl border border-gray-200 bg-gray-50 p-6 ${className || ""}`}>
        <div className="text-sm text-gray-700 mb-2">Map Preview</div>
        <div className="text-sm text-gray-600 mb-4">
          This listing doesn't have coordinates set yet.
        </div>
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${q}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition"
        >
          Open in Google Maps
        </a>
      </div>
    );
  }

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  return (
    <div className={className || ""}>
      {/* Address Display */}
      {address && (
        <div className="mb-4 flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-medium text-gray-500 mb-1">Property Address</div>
              <div className="text-base text-gray-900 font-medium">{address}</div>
            </div>
          </div>
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 hover:text-amber-800 bg-white border border-gray-300 rounded-lg hover:border-amber-600 transition-all flex-shrink-0"
          >
            <span>View in Maps</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      )}

      {/* Map Container */}
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <MapContainer
          center={position}
          zoom={15}
          scrollWheelZoom={false}
          zoomControl={false}
          style={{ height: 400, width: "100%" }}
          attributionControl={true}
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <ZoomControl position="topright" />
          <Marker position={position}>
            <Popup>
              <div style={{ fontWeight: 600 }}>{title || "Listing location"}</div>
              {address ? <div style={{ opacity: 0.8, marginTop: 4 }}>{address}</div> : null}
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}
