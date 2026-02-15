import type { GridResponse, AdapterConfig } from '../types/grid.js';

export interface IAdapter {

    fetchAvailability(startDate: string, endDate: string, config: AdapterConfig): Promise<GridResponse>;
}
