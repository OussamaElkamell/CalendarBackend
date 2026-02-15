import type { AdapterConfig } from "../types/grid.js";

// Centralized tenant configuration store
const TENANTS: Record<string, AdapterConfig> = {
    demo: {
        tenantId: "demo",
        provider: "mock",
        settings: {},
    },

    // Example: Wix tenant
    wix_demo: {
        tenantId: "wix_demo",
        provider: "wix",
        settings: {
            // tokens, siteId, serviceId mapping, etc.
        },
    },
    wix_prod: {
        tenantId: "wix_prod",
        provider: "custom",
        settings: {
            baseUrl: "https://YOUR-WIX-DOMAIN.com",
            availabilityEndpoint: "/_functions/calendarGrid"
        }
    },

    // Example: custom backend tenant (using PassThroughAdapter)
    partner1: {
        tenantId: "partner1",
        provider: "custom",
        settings: {
            baseUrl: "https://partner1.com/api",
            availabilityEndpoint: "/availability",
        },
    },
};

/**
 * Retrieves the configuration for a given tenant.
 * @param tenantId The unique ID of the tenant
 * @returns The AdapterConfig for the tenant
 * @throws Error if tenant is not found
 */
export function getTenantConfig(tenantId: string): AdapterConfig {
    const cfg = TENANTS[tenantId];
    if (!cfg) {
        throw new Error(`Tenant not found: ${tenantId}`);
    }
    return cfg;
}
