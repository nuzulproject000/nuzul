/* SEO for hotel pages (§68): title, description, canonical, Open Graph and schema.org Hotel JSON-LD.
 * In production this belongs in SSR/prerender; client-side tags still help link previews from crawlers that run JS. */
import { useEffect } from "react";
import type { Hotel } from "@/types/models";
import { hotelPath } from "@/app/paths";

function meta(attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
  el.content = content;
}

export function useSeo(h: Hotel) {
  useEffect(() => {
    const prev = document.title;
    const url = `${window.location.origin}${hotelPath(h)}`;
    document.title = `${h.name}, ${h.city} — Nuzul`;
    meta("name", "description", h.description.slice(0, 155));
    meta("property", "og:title", h.name);
    meta("property", "og:description", h.description.slice(0, 155));
    meta("property", "og:image", h.images[0]);
    meta("property", "og:url", url);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = url;
    const ld = document.createElement("script");
    ld.type = "application/ld+json"; ld.id = "hotel-jsonld";
    ld.text = JSON.stringify({
      "@context": "https://schema.org", "@type": "Hotel", name: h.name, description: h.description, image: h.images, url,
      address: { "@type": "PostalAddress", addressLocality: h.city, addressCountry: h.country, streetAddress: h.area },
      geo: { "@type": "GeoCoordinates", latitude: h.coordinates.lat, longitude: h.coordinates.lng },
      aggregateRating: { "@type": "AggregateRating", ratingValue: h.rating, reviewCount: h.reviewCount, bestRating: 5 },
      checkinTime: h.checkIn, checkoutTime: h.checkOut, amenityFeature: h.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
    });
    document.getElementById("hotel-jsonld")?.remove();
    document.head.appendChild(ld);
    return () => { document.title = prev; ld.remove(); };
  }, [h]);
}
