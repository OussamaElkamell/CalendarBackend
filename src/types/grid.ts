export type AvailabilityStatus = 'available' | 'booked' | 'unavailable' | 'pending';

export interface DayAvailability {
  status: AvailabilityStatus;
  price?: number;
  remaining?: number;
}

export interface GridItem {
  id: string;
  name: string;
  image?: string;
  url?: string;
  availability: Record<string, DayAvailability>; // Key is ISO date string YYYY-MM-DD
  metadata?: Record<string, any>;
}

export interface GridResponse {
  version: string;
  dates: string[]; // Array of ISO date strings YYYY-MM-DD
  items: GridItem[];
  metadata?: {
    currency?: string;
    timezone?: string;
  };
}

import type { Provider } from "./providers.js";

export interface AdapterConfig {
  tenantId: string;
  provider: Provider;
  settings: Record<string, any>;
}
