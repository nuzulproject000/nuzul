/* Room management (§44). */
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Users } from "lucide-react";
import type { CancellationPolicy, Room, RoomType } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Chip, ErrorState } from "@/components/common";
import { Toolbar } from "@/components/dashboard";
import { useHostHotels, useHostMutation } from "@/hooks/queries";
import { hostService } from "@/services/ops.service";
import { applyFieldErrors, errorMessage } from "@/lib/forms";
import { cn } from "@/lib/utils";

const ROOM_AMENITIES = ["Sea view", "Balcony", "Bathtub", "Minibar", "Safe", "Coffee machine", "Smart TV", "Blackout curtains", "Breakfast included", "Free Wi-Fi", "Terrace", "Lounge access"];

export default function HostRooms() {
  const { t } = useTranslation();
  const { data: hotels, error, refetch } = useHostHotels();
  const [hotelId, setHotelId] = useState<string>();
  const hotel = hotels?.find((h) => h.id === hotelId) ?? hotels?.[0];
  const [roomId, setRoomId] = useState<string>();
  const room = hotel?.rooms.find((r) => r.id === roomId) ?? hotel?.rooms[0];
  if (error) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (!hotel || !room) return <div className="skeleton h-96" />;
  return (
    <>
      <Toolbar title={t("host.rooms.title", { hotel: hotel.name })} sub={t("host.roomTypes", { count: hotel.rooms.length })}>
        {hotels && hotels.length > 1 && <Select ariaLabel={t("host.col.property")} value={hotel.id} onValueChange={(v) => { setHotelId(v); setRoomId(undefined); }} options={hotels.map((h) => ({ value: h.id, label: h.name }))} className="min-h-10 w-64" />}
      </Toolbar>
      <div className="grid grid-cols-[220px_1fr] border border-line bg-paper max-md:grid-cols-1">
        <nav className="flex flex-col border-e border-line p-3 max-md:flex-row max-md:overflow-x-auto max-md:border-e-0 max-md:border-b">
          {hotel.rooms.map((r) => <button key={r.id} type="button" aria-current={r.id === room.id} onClick={() => setRoomId(r.id)} className={cn("flex items-center gap-2 rounded-md px-3 py-2.5 text-start text-[12px] whitespace-nowrap", r.id === room.id ? "bg-navy text-white" : "text-navy hover:bg-soft")}><Users className="size-3.5" /> {r.name}</button>)}
        </nav>
        <RoomForm key={room.id} room={room} />
      </div>
    </>
  );
}

function RoomForm({ room }: { room: Room }) {
  const { t } = useTranslation();
  const [d, setD] = useState(room);
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setD(room), [room]);
  const save = useHostMutation((patch: Partial<Room>) => hostService.updateRoom(room.id, patch));
  const num = (k: keyof Room) => (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [k]: Number(e.target.value) });
  const submit = () => {
    const e: Record<string, string> = {};
    if (!d.name.trim()) e.name = t("host.v.name");
    if (d.nightlyPrice <= 0) e.nightlyPrice = t("host.v.price");
    if (d.minStay > d.maxStay) e.minStay = t("host.v.stay");
    if (d.available > d.totalUnits) e.available = t("host.v.units");
    setErrors(e);
    if (Object.keys(e).length) return;
    const { id: _id, hotelId: _h, ...patch } = d;
    save.mutate(patch, { onSuccess: () => toast.success(t("host.saved")), onError: (er) => { if (!applyFieldErrors(er, (k, v) => setErrors((x) => ({ ...x, [k]: v.message ?? "" })))) toast.error(errorMessage(er, t("errors.generic"))); } });
  };
  return (
    <section className="p-6 max-md:p-4">
      <span className="eyebrow">{t("host.rooms.details")}</span>
      <h2 className="text-[22px]">{room.name}</h2>
      <div className="mb-5 flex gap-2 overflow-x-auto">{d.images.map((src) => <img key={src} src={src} alt="" className="h-20 w-28 shrink-0 object-cover" />)}</div>
      <div className="grid grid-cols-3 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Field label={t("host.f.roomName")} htmlFor="r-name" error={errors.name}><Input id="r-name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} /></Field>
        <Field label={t("filters.roomType")} htmlFor="r-type"><Select id="r-type" value={d.type} onValueChange={(v) => setD({ ...d, type: v as RoomType })} options={(["SINGLE", "DOUBLE", "TRIPLE", "SUITE", "FAMILY", "APARTMENT"] as const).map((x) => ({ value: x, label: t(`match.room.${x}`) }))} /></Field>
        <Field label={t("host.f.capacity")} htmlFor="r-cap"><Input id="r-cap" type="number" min={1} value={d.capacity} onChange={num("capacity")} /></Field>
        <Field label={t("host.f.beds")} htmlFor="r-beds"><Input id="r-beds" value={d.beds} onChange={(e) => setD({ ...d, beds: e.target.value })} /></Field>
        <Field label={t("filters.bathrooms")} htmlFor="r-bath"><Input id="r-bath" type="number" min={0} value={d.bathrooms} onChange={num("bathrooms")} /></Field>
        <Field label={t("host.f.size")} htmlFor="r-size"><Input id="r-size" type="number" min={1} value={d.sizeM2} onChange={num("sizeM2")} /></Field>
        <Field label={t("host.f.price")} htmlFor="r-price" error={errors.nightlyPrice}><Input id="r-price" type="number" min={1} value={d.nightlyPrice} onChange={num("nightlyPrice")} /></Field>
        <Field label={t("host.f.units")} htmlFor="r-units"><Input id="r-units" type="number" min={1} value={d.totalUnits} onChange={num("totalUnits")} /></Field>
        <Field label={t("host.f.available")} htmlFor="r-avail" error={errors.available}><Input id="r-avail" type="number" min={0} value={d.available} onChange={num("available")} /></Field>
        <Field label={t("host.f.cancellation")} htmlFor="r-pol"><Select id="r-pol" value={d.cancellationPolicy} onValueChange={(v) => setD({ ...d, cancellationPolicy: v as CancellationPolicy })} options={(["NON_REFUNDABLE", "FLEXIBLE", "MODERATE", "STRICT"] as const).map((p) => ({ value: p, label: t(`policy.${p}`) }))} /></Field>
        <Field label={t("host.f.minStay")} htmlFor="r-min" error={errors.minStay}><Input id="r-min" type="number" min={1} value={d.minStay} onChange={num("minStay")} /></Field>
        <Field label={t("host.f.maxStay")} htmlFor="r-max"><Input id="r-max" type="number" min={1} value={d.maxStay} onChange={num("maxStay")} /></Field>
      </div>
      <h4 className="mt-6 mb-2 text-[13px]">{t("host.rooms.amenities")}</h4>
      <div className="flex flex-wrap gap-2">{ROOM_AMENITIES.map((a) => <Chip key={a} active={d.amenities.includes(a)} onClick={() => setD({ ...d, amenities: d.amenities.includes(a) ? d.amenities.filter((x) => x !== a) : [...d.amenities, a] })}>{a}</Chip>)}</div>
      <div className="mt-6 flex gap-2 border-t border-line pt-5"><Button variant="gold" disabled={save.isPending || JSON.stringify(d) === JSON.stringify(room)} onClick={submit}>{t("host.rooms.save")}</Button><Button variant="outline" onClick={() => { setD(room); setErrors({}); }}>{t("common.reset")}</Button></div>
    </section>
  );
}
