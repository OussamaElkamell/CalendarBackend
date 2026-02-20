import type { IAdapter } from "./IAdapter.js";
import type { GridResponse, AdapterConfig, GridItem, DayAvailability } from "../types/grid.js";
import axios from "axios";

/**
 * Booqable Adapter
 * Fetches products and availability (plannings) directly from Booqable API v4.
 *
 * Booqable uses JSONAPI format:
 *   response.data.data = array of resource objects
 *   each object: { id, type, attributes: { name, photo_url, base_price_in_cents, ... } }
 */
export class BooqableAdapter implements IAdapter {
    async fetchAvailability(
        startDate: string,
        endDate: string,
        config: AdapterConfig
    ): Promise<GridResponse> {
        const { source, apiKey } = config.settings;

        if (!source) {
            throw new Error("Booqable adapter requires 'source' (e.g., https://yourcompany.booqable.com)");
        }
        if (!apiKey) {
            throw new Error("Booqable adapter requires 'apiKey'");
        }

        const baseUrl = source.replace(/\/$/, "");
        const authHeader = { Authorization: `Bearer ${apiKey}` };

        try {
            // 1. Fetch Bundles
            // GET /api/4/bundles returns: id, name, slug, photo_url, show_in_store, etc.
            const bundlesRes = await axios.get(`${baseUrl}/api/4/bundles`, {
                headers: authHeader,
                params: { "page[size]": 100 }
            });

            const rawBundles: any[] = bundlesRes.data.data || [];

            // Only show bundles visible in the storefront
            const visibleBundles = rawBundles.filter((b: any) => {
                const attrs = b.attributes || b;
                return attrs.show_in_store !== false && !attrs.archived;
            });

            // 2. Fetch Plannings (Bookings/Reservations)
            // Fetch ALL plannings in the range and filter in-memory.
            // This avoids 400 errors from strict filters like `item_type` which can be tricky.
            const planningsRes = await axios.get(`${baseUrl}/api/4/plannings`, {
                headers: authHeader,
                params: {
                    "filter[starts_at][lte]": endDate + "T23:59:59Z",
                    "filter[stops_at][gte]": startDate + "T00:00:00Z",
                    "page[size]": 1000
                }
            });

            const rawPlannings: any[] = planningsRes.data.data || planningsRes.data.plannings || [];
            const dates = this.generateDateRange(startDate, endDate);

            const items: GridItem[] = visibleBundles.map((resource: any) => {
                const b = resource.attributes || resource;
                const bundleId = String(resource.id);

                const item: GridItem = {
                    id: bundleId,
                    name: b.name || "Unnamed Bundle",
                    ...(b.photo_url && { image: b.photo_url }),
                    // Use bundle slug for the correct storefront URL
                    ...(b.slug && { url: `${baseUrl}/products/${b.slug}` }),
                    availability: {},
                    metadata: { ...b, id: bundleId }
                };

                // Default all dates to available
                const priceInCents = b.base_price_in_cents ?? b.price_in_cents ?? 0;
                const basePrice = priceInCents / 100;
                dates.forEach(date => {
                    item.availability[date] = { status: 'available', price: basePrice };
                });

                // Map plannings from the flat list to this bundle
                const bundlePlannings = rawPlannings.filter((pl: any) => {
                    const plAttrs = pl.attributes || pl;
                    // Plannings have `item_id` in attributes pointing to the bundle/product ID
                    // Check attributes first, then fallback to relationships standard JSONAPI
                    const planningItemId = plAttrs.item_id || pl.relationships?.item?.data?.id;
                    return String(planningItemId) === bundleId;
                });

                bundlePlannings.forEach((pl: any) => {
                    const plAttrs = pl.attributes || pl;
                    const bStart = new Date(plAttrs.starts_at);
                    const bEnd = new Date(plAttrs.stops_at);

                    dates.forEach(date => {
                        const current = new Date(date);
                        if (current >= bStart && current < bEnd && item.availability[date]) {
                            (item.availability[date] as DayAvailability).status = 'booked';
                        }
                    });
                });

                return item;
            });

            return { version: "1.0", dates, items };

        } catch (error: any) {
            console.error("[BooqableAdapter] API Error:", error.message);
            // If axios error has response data, include it in the thrown error
            if (error.response?.data) {
                const detail = JSON.stringify(error.response.data);
                console.error("API Error Details:", detail);
                throw new Error(`Booqable API Error: ${detail}`);
            }
            throw new Error(`Booqable Integration Error: ${error.message}`);
        }
    }

    private generateDateRange(startStr: string, endStr: string): string[] {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const dates: string[] = [];
        let current = new Date(start);
        while (current <= end) {
            const iso = current.toISOString().split('T')[0];
            if (iso) dates.push(iso);
            current.setDate(current.getDate() + 1);
        }
        return dates;
    }
}
