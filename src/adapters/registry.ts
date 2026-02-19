import type { IAdapter } from "./IAdapter.js";
import { MockAdapter } from "./MockAdapter.js";
import { PassThroughAdapter } from "./PassThroughAdapter.js";
import { WixVeloAdapter } from "./WixVeloAdapter.js";
import { BooqableAdapter } from "./BooqableAdapter.js";

// Stubs for providers that are not yet fully implemented
class NotImplementedAdapter implements IAdapter {
    async fetchAvailability(): Promise<any> {
        throw new Error("Provider adapter not implemented yet");
    }
}

// Maintain singletons of adapters to avoid re-instantiation per request
export const adapterRegistry: Record<string, IAdapter> = {
    mock: new MockAdapter(),
    wix: new WixVeloAdapter(), // Universal mapping adapter
    generic: new WixVeloAdapter(), // Use for any other REST API
    booqable: new BooqableAdapter(),
    wordpress: new PassThroughAdapter(), // Recommend external endpoint
    custom: new PassThroughAdapter(), // Recommend external endpoint
};

/**
 * Retrieves the adapter instance for a given provider.
 * @param provider The name of the provider (e.g., 'mock', 'wix')
 * @returns The IAdapter instance
 */
export function getAdapter(provider: string): IAdapter {
    const adapter = adapterRegistry[provider];
    if (!adapter) {
        throw new Error(`Unknown provider: ${provider}`);
    }
    return adapter;
}
