import type { Hotel } from "@/types/models";

/** SEO-friendly hotel URL (§68): /hotels/egypt/cairo/four-seasons-nile-plaza */
export const hotelPath = (h: Pick<Hotel, "slug">) => `/hotels/${h.slug}`;
export const bookPath = (hotelId: string, roomId?: string) => `/book/${hotelId}${roomId ? `?room=${roomId}` : ""}`;
