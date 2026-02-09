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

export interface AdapterConfig {
  tenantId: string;
  provider: string;
  settings: Record<string, any>;
}
