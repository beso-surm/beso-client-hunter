/**
 * Tool: searchBusinesses(query, city, category)
 *
 * Pluggable business discovery:
 *  - If GOOGLE_PLACES_API_KEY is set, queries the Google Places API (New) and
 *    returns REAL businesses with whatever real contact data Google exposes.
 *  - Otherwise returns clearly-labelled DEMO candidates with contact fields
 *    left blank. We never fabricate phone numbers, emails or websites.
 */

import "server-only";
import type { LeadSource } from "@/types";

export interface BusinessCandidate {
  business_name: string;
  category: string | null;
  city: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  phone: string | null;
  email: string | null;
  source: LeadSource;
}

const placesKey = process.env.GOOGLE_PLACES_API_KEY;
export const searchProvider: "google_places" | "demo" = placesKey
  ? "google_places"
  : "demo";

export async function searchBusinesses(
  query: string,
  city: string,
  category: string,
  maxResults = 8,
): Promise<BusinessCandidate[]> {
  if (placesKey) {
    return searchGooglePlaces(query, city, category, maxResults);
  }
  return demoCandidates(city, category, maxResults);
}

// --- Google Places (New) Text Search --------------------------------------

interface PlacesResponse {
  places?: Array<{
    displayName?: { text?: string };
    websiteUri?: string;
    nationalPhoneNumber?: string;
    internationalPhoneNumber?: string;
  }>;
}

async function searchGooglePlaces(
  query: string,
  city: string,
  category: string,
  maxResults: number,
): Promise<BusinessCandidate[]> {
  const textQuery = `${query || category} in ${city}, Georgia`;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": placesKey as string,
      "X-Goog-FieldMask":
        "places.displayName,places.websiteUri,places.nationalPhoneNumber,places.internationalPhoneNumber",
    },
    body: JSON.stringify({
      textQuery,
      maxResultCount: Math.min(maxResults, 20),
      regionCode: "GE",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Google Places error ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as PlacesResponse;
  return (data.places ?? [])
    .filter((p) => p.displayName?.text)
    .slice(0, maxResults)
    .map((p) => ({
      business_name: p.displayName!.text as string,
      category,
      city,
      website_url: p.websiteUri ?? null,
      instagram_url: null,
      facebook_url: null,
      phone: p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null,
      email: null, // Places does not expose email — never invent one
      source: "google_places" as const,
    }));
}

// --- Demo provider --------------------------------------------------------

const DEMO_PREFIXES = [
  "Old Town",
  "Riverside",
  "Central",
  "Hillside",
  "Sunrise",
  "Green Garden",
  "Panorama",
  "Cozy",
  "Royal",
  "Family",
];

function demoCandidates(
  city: string,
  category: string,
  maxResults: number,
): BusinessCandidate[] {
  const count = Math.min(Math.max(maxResults, 1), DEMO_PREFIXES.length);
  return Array.from({ length: count }, (_, i) => ({
    business_name: `${DEMO_PREFIXES[i]} ${category} ${city}`,
    category,
    city,
    // Demo candidates deliberately have NO contact data — never fabricated.
    website_url: null,
    instagram_url: null,
    facebook_url: null,
    phone: null,
    email: null,
    source: "demo" as const,
  }));
}
