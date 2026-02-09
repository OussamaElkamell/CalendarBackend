import type { GridResponse, AdapterConfig } from '../types/grid.js';

export interface IAdapter {
    /**
     * Fetch availability data from the provider and normalize it to GridResponse V1
     */
    fetchAvailability(startDate: string, endDate: string, config: AdapterConfig): Promise<GridResponse>;
}
