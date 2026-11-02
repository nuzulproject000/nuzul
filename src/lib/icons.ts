import type { LucideIcon } from "lucide-react";
import { Accessibility, Bell, Briefcase, Building, Building2, Car, Coffee, Compass, Dumbbell, Gem, Heart, House, Hotel, KeyRound, Landmark, Leaf, MapPin, Mountain, Percent, Plane, ShoppingBag, Snowflake, Sun, TrainFront, TreePalm, Umbrella, Users, UtensilsCrossed, WashingMachine, Waves, Wifi } from "lucide-react";
import type { NearbyPlace } from "@/types/models";

const CATEGORY: Record<string, LucideIcon> = {
  Beach: Umbrella, Luxury: Gem, Resorts: TreePalm, Pools: Waves, City: Building2, Romantic: Heart, Family: Users, Business: Briefcase,
  Boutique: KeyRound, Budget: Percent, Spa: Leaf, Nature: Mountain, Apartments: House, Villas: Hotel, "Hotels with views": Sun, "Hotels near landmarks": Landmark,
};
export const categoryIcon = (name: string): LucideIcon => CATEGORY[name] ?? Compass;

const AMENITY: Record<string, LucideIcon> = {
  "Wi-Fi": Wifi, Pool: Waves, Gym: Dumbbell, Spa: Leaf, Parking: Car, Restaurant: UtensilsCrossed, "Air conditioning": Snowflake, Kitchen: Coffee,
  Workspace: Briefcase, Elevator: Building, "Room service": Bell, Laundry: WashingMachine, "Beach access": Umbrella,
};
export const amenityIcon = (name: string): LucideIcon => AMENITY[name] ?? Accessibility;

const NEARBY: Record<NearbyPlace["kind"], LucideIcon> = { AIRPORT: Plane, TRANSPORT: TrainFront, SHOPPING: ShoppingBag, LANDMARK: Landmark, ATTRACTION: Compass, BEACH: Umbrella, RESTAURANTS: UtensilsCrossed };
export const nearbyIcon = (kind: NearbyPlace["kind"]): LucideIcon => NEARBY[kind] ?? MapPin;

export const AMENITIES = ["Wi-Fi", "Pool", "Gym", "Spa", "Parking", "Restaurant", "Air conditioning", "Kitchen", "Workspace", "Elevator", "Room service", "Laundry", "Beach access"];
export const ACCESSIBILITY = ["Step-free access", "Accessible bathroom", "Elevator", "Accessible parking", "Accessible room"];
export const ATMOSPHERES = ["Quiet", "Romantic", "Luxury", "Relaxation", "Lively", "Business", "Family", "Boutique", "Heritage"];
