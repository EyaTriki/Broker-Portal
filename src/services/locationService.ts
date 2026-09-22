// src/services/locationService.ts

import { ConfigEnv } from '@config/configEnv';

const FALLBACK_POSTCODE_API_KEY = 'ak_ma0z4fvyZQYl8mKxJTQvbPYVVrExS';

export interface IdealPostcodeResult {
  line_1: string;
  line_2: string;
  line_3?: string;
  post_town: string;
  county: string;
  postcode: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface AddressLookupOption {
  label: string;
  lat: number;
  long: number;
  line1: string;
  line2: string;
  city: string;
  region: string;
  postcode: string;
  country: string;
}

export interface PostcodeLookupResponse {
  addresses: AddressLookupOption[];
  error?: string;
  suggestions?: string[];
}

function formatAddressLabel(addr: IdealPostcodeResult) {
  return [addr.line_1, addr.line_2, addr.post_town, addr.postcode].filter(Boolean).join(', ');
}

function normalizePostcode(postcode: string) {
  return postcode.trim().toUpperCase().replace(/\s+/g, ' ');
}

function mapAddresses(addresses: IdealPostcodeResult[], normalized: string): AddressLookupOption[] {
  return addresses.map((addr) => ({
    label: formatAddressLabel(addr),
    lat: addr.latitude,
    long: addr.longitude,
    line1: addr.line_1 || '',
    line2: [addr.line_2, addr.line_3].filter(Boolean).join(', '),
    city: addr.post_town || '',
    region: addr.county || '',
    postcode: addr.postcode || normalized,
    country: addr.country || 'United Kingdom',
  }));
}

function getPostcodeApiKeys(): string[] {
  const envKey = String(ConfigEnv.IDEAL_POSTCODE_API_KEY || '').trim();
  if (envKey && envKey !== FALLBACK_POSTCODE_API_KEY) {
    return [envKey, FALLBACK_POSTCODE_API_KEY];
  }
  return [FALLBACK_POSTCODE_API_KEY];
}

async function requestPostcodeAddresses(
  normalized: string,
  apiKey: string,
): Promise<{ ok: boolean; status: number; data: any }> {
  const url = `https://api.ideal-postcodes.co.uk/v1/postcodes/${encodeURIComponent(
    normalized,
  )}?api_key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export async function lookupPostcodeAddresses(postcode: string): Promise<PostcodeLookupResponse> {
  const normalized = normalizePostcode(postcode);

  if (normalized.length < 3) {
    return { addresses: [] };
  }

  try {
    for (const apiKey of getPostcodeApiKeys()) {
      const { ok, status, data } = await requestPostcodeAddresses(normalized, apiKey);

      if (ok) {
        const addresses = Array.isArray(data.result) ? mapAddresses(data.result, normalized) : [];
        return { addresses };
      }

      if (status === 401 || status === 403) {
        continue;
      }

      if (status === 404) {
        return {
          addresses: [],
          error: data?.message || 'Postcode not found',
          suggestions: Array.isArray(data?.suggestions) ? data.suggestions : undefined,
        };
      }

      return {
        addresses: [],
        error: data?.message || 'Unable to look up addresses for this postcode',
      };
    }

    return {
      addresses: [],
      error: 'Postcode lookup is unavailable right now. Please enter the address manually.',
    };
  } catch (error) {
    console.error('Error fetching postcode addresses:', error);
    return {
      addresses: [],
      error: 'Unable to reach the postcode lookup service. Please enter the address manually.',
    };
  }
}

export async function fetchLocationsByPostcode(postcode: string): Promise<AddressLookupOption[]> {
  const { addresses } = await lookupPostcodeAddresses(postcode);
  return addresses;
}
