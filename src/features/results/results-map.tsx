/* Interactive map (§36) — React Leaflet + OpenStreetMap: price markers, clustering,
 * zoom/pan, current location, "search this area", landmarks, card ↔ marker highlight. */
import { useEffect, useMemo, useState } from "react";
import { MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L, { type LatLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crosshair, Layers, Minus, Plus, Search, X } from "lucide-react";
import type { HotelWithMatch } from "@/types/api";
import { MatchPill } from "@/components/match";
import { Button } from "@/components/ui/button";
import { useMoney } from "@/hooks/use-format";
import { hotelPath } from "@/app/paths";
import { cn } from "@/lib/utils";

const LANDMARKS = [
  { name: "Giza Pyramids", lat: 29.9792, lng: 31.1342 }, { name: "Egyptian Museum", lat: 30.0478, lng: 31.2336 }, { name: "Naama Bay", lat: 27.9158, lng: 34.3299 },
  { name: "Ras Mohammed", lat: 27.7333, lng: 34.25 }, { name: "Bibliotheca Alexandrina", lat: 31.2089, lng: 29.9092 }, { name: "El Gouna Marina", lat: 27.3956, lng: 33.6828 },
  { name: "Burj Khalifa", lat: 25.1972, lng: 55.2744 }, { name: "Eiffel Tower", lat: 48.8584, lng: 2.2945 }, { name: "St Paul’s", lat: 51.5138, lng: -0.0984 },
];

const priceIcon = (label: string, active: boolean) => L.divIcon({ className: "", html: `<div class="nuzul-marker${active ? " is-active" : ""}">${label}</div>`, iconSize: [0, 0] });
const clusterIcon = (n: number) => L.divIcon({ className: "", html: `<div class="nuzul-cluster">${n}</div>`, iconSize: [0, 0] });
const landmarkIcon = (name: string) => L.divIcon({ className: "", html: `<div style="transform:translate(-50%,-50%);font:600 10px Montserrat,sans-serif;color:#0f1c2e;background:rgba(255,255,255,.85);padding:3px 6px;border-radius:4px;white-space:nowrap">◆ ${name}</div>`, iconSize: [0, 0] });

function FitToHotels({ hotels, focus }: { hotels: HotelWithMatch[]; focus?: string }) {
  const map = useMap();
  const key = hotels.map((h) => h.id).join() + focus;
  useEffect(() => {
    // Frame the searched destination; alternatives elsewhere stay reachable by panning/zooming out.
    const inFocus = focus ? hotels.filter((h) => h.city === focus || h.country === focus) : [];
    const pts = (inFocus.length ? inFocus : hotels).map((h) => [h.coordinates.lat, h.coordinates.lng] as [number, number]);
    if (!pts.length) return;
    const b = L.latLngBounds(pts);
    map.fitBounds(b, { padding: [48, 48], maxZoom: 13 });
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Controls({ onMoved, layers, setLayers }: { onMoved: (b: LatLngBounds) => void; layers: boolean; setLayers: (v: boolean) => void }) {
  const { t } = useTranslation();
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()), dragend: () => onMoved(map.getBounds()) });
  const locate = () => map.locate({ setView: true, maxZoom: 12 });
  return (
    <div className="absolute end-4 bottom-6 z-[500] flex flex-col overflow-hidden rounded-md border border-line bg-white shadow">
      {[{ i: Plus, l: t("results.zoomIn"), f: () => map.zoomIn(), d: zoom >= 18 }, { i: Minus, l: t("results.zoomOut"), f: () => map.zoomOut(), d: zoom <= 2 }, { i: Crosshair, l: t("results.myLocation"), f: locate, d: false }].map(({ i: Icon, l, f, d }) => (
        <button key={l} type="button" onClick={f} disabled={d} aria-label={l} className="grid size-[38px] place-items-center border-b border-line text-navy disabled:opacity-30"><Icon className="size-4" /></button>
      ))}
      <button type="button" onClick={() => setLayers(!layers)} aria-pressed={layers} aria-label={t("results.layers")} className={cn("grid size-[38px] place-items-center", layers ? "bg-navy text-white" : "text-navy")}><Layers className="size-4" /></button>
    </div>
  );
}

function ClusteredMarkers({ hotels, activeId, onSelect }: { hotels: HotelWithMatch[]; activeId: string | null; onSelect: (id: string) => void }) {
  const map = useMap();
  const money = useMoney();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  // Grid clustering in screen space: points closer than ~56px merge (no extra dependency).
  const clusters = useMemo(() => {
    const out: { lat: number; lng: number; items: HotelWithMatch[] }[] = [];
    hotels.forEach((h) => {
      const p = map.project([h.coordinates.lat, h.coordinates.lng], zoom);
      const c = out.find((o) => map.project([o.lat, o.lng], zoom).distanceTo(p) < 56);
      if (c) c.items.push(h); else out.push({ lat: h.coordinates.lat, lng: h.coordinates.lng, items: [h] });
    });
    return out;
  }, [hotels, zoom, map]);
  return (
    <>
      {clusters.map((c) => c.items.length > 1
        ? <Marker key={c.items.map((i) => i.id).join()} position={[c.lat, c.lng]} icon={clusterIcon(c.items.length)} eventHandlers={{ click: () => map.flyToBounds(L.latLngBounds(c.items.map((h) => [h.coordinates.lat, h.coordinates.lng])), { padding: [60, 60], maxZoom: 15 }) }} keyboard title={`${c.items.length} stays`} />
        : <Marker key={c.items[0].id} position={[c.lat, c.lng]} icon={priceIcon(money(c.items[0].fromPrice, c.items[0].currency), activeId === c.items[0].id)} eventHandlers={{ click: () => onSelect(c.items[0].id) }} keyboard title={c.items[0].name} zIndexOffset={activeId === c.items[0].id ? 1000 : 0} />)}
    </>
  );
}

/** Landmarks & neighbourhood labels appear once the map is zoomed in enough to read them. */
function Landmarks() {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  if (zoom < 9) return null;
  return <>{LANDMARKS.map((l) => <Marker key={l.name} position={[l.lat, l.lng]} icon={landmarkIcon(l.name)} interactive={false}><Tooltip>{l.name}</Tooltip></Marker>)}</>;
}

export function ResultsMap({ hotels, hoverId, selectedId, onSelect, onSearchArea, focus }: { hotels: HotelWithMatch[]; hoverId: string | null; selectedId: string | null; onSelect: (id: string | null) => void; onSearchArea: (b: LatLngBounds | null) => void; focus?: string }) {
  const { t } = useTranslation();
  const money = useMoney();
  const [moved, setMoved] = useState<LatLngBounds | null>(null);
  const [layers, setLayers] = useState(true);
  const selected = hotels.find((h) => h.id === selectedId);
  return (
    <div className="relative h-full min-h-[460px]" aria-label={t("results.map")}>
      <MapContainer center={[27.5, 33]} zoom={6} zoomControl={false} scrollWheelZoom className="h-full w-full" attributionControl>
        <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FitToHotels hotels={hotels} focus={focus} />
        <ClusteredMarkers hotels={hotels} activeId={hoverId ?? selectedId} onSelect={(id) => onSelect(id)} />
        {layers && <Landmarks />}
        <Controls onMoved={(b) => setMoved(b)} layers={layers} setLayers={setLayers} />
      </MapContainer>
      {moved && <button type="button" onClick={() => { onSearchArea(moved); setMoved(null); }} className="absolute start-1/2 top-4 z-[500] flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-paper px-4 py-2.5 text-[12px] font-bold text-navy shadow-lift rtl:translate-x-1/2"><Search className="size-3.5" /> {t("results.searchArea")}</button>}
      {selected && (
        <div className="absolute inset-x-4 bottom-4 z-[500] grid grid-cols-[110px_1fr_auto] items-center gap-3 bg-paper p-2.5 shadow-lift">
          <img src={selected.images[0]} alt="" className="h-[84px] w-full object-cover" />
          <div className="flex min-w-0 flex-col items-start gap-1"><b className="truncate text-[13px] text-navy">{selected.name}</b><small className="text-[11px] text-ink-muted">{selected.area}, {selected.city}</small><MatchPill score={selected.match.score} hotelId={selected.id} /><span className="text-[11px] text-ink-muted">{money(selected.fromPrice, selected.currency)} {t("common.perNight")}</span></div>
          <Button size="sm" asChild><Link to={hotelPath(selected)}>{t("common.view")}</Link></Button>
          <button type="button" onClick={() => onSelect(null)} aria-label={t("common.close")} className="absolute end-1.5 top-1.5 grid size-6 place-items-center rounded-full bg-soft"><X className="size-3.5" /></button>
        </div>
      )}
    </div>
  );
}
