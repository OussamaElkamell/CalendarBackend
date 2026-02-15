import type { IAdapter } from "./IAdapter.js";
import type { GridResponse, AdapterConfig } from "../types/grid.js";
import axios from "axios";

/**
 * A generic adapter that assumes the external service already returns 
 * data in the GridResponse format. This is the simplest way for 
 * third-party developers to integrate.
 */
export class PassThroughAdapter implements IAdapter {
    async fetchAvailability(
        start: string,
        end: string,
        config: AdapterConfig
    ): Promise<GridResponse> {
        const { baseUrl, availabilityEndpoint } = config.settings;

        if (!baseUrl || !availabilityEndpoint) {
            throw new Error("PassThroughAdapter requires 'baseUrl' and 'availabilityEndpoint' in settings");
        }

        const url = `${baseUrl}${availabilityEndpoint}`;

        try {
            const response = await axios.get<GridResponse>(url, {
                params: {
                    tenantId: config.tenantId,
                    start,
                    end
                }
            });

            return response.data;
        } catch (error: any) {
            console.error(`Error in PassThroughAdapter calling ${url}:`, error.message);
            throw new Error(`Failed to fetch availability from external service: ${error.message}`);
        }
    }
}
