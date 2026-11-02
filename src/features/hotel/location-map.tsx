/* Hotel location mini-map (§23) — single marker + nearby label. */
import { MapContainer, Marker, TileLayer } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { HotelWithMatch } from "@/types/api";

export default function LocationMap({ hotel }: { hotel: HotelWithMatch }) {
  const icon = L.divIcon({ className: "", html: `<div class="nuzul-marker is-active">${hotel.name.split(" ").slice(0, 2).join(" ")}</div>`, iconSize: [0, 0] });
  return (
    <MapContainer center={[hotel.coordinates.lat, hotel.coordinates.lng]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[hotel.coordinates.lat, hotel.coordinates.lng]} icon={icon} title={hotel.name} />
    </MapContainer>
  );
}
