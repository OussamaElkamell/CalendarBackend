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
            // 1. Fetch Products — JSONAPI: response.data.data is the array
            const productsRes = await axios.get(`${baseUrl}/api/4/products`, {
                headers: authHeader,
                params: { "page[size]": 100 }
            });

            // Support both JSONAPI (data.data) and legacy (data.products)
            const rawProducts: any[] = productsRes.data.data || productsRes.data.products || [];

            // 2. Fetch Plannings (Bookings/Reservations) — JSONAPI format
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

            const items: GridItem[] = rawProducts.map((resource: any) => {
                // JSONAPI: id is at top level, everything else is under attributes
                const p = resource.attributes || resource;
                const productId = String(resource.id);

                const item: GridItem = {
                    id: productId,
                    name: p.name || p.group_name || "Unnamed Product",
                    ...(p.photo_url && { image: p.photo_url }),
                    ...(p.slug && { url: `${baseUrl}/products/${p.slug}` }),
                    availability: {},
                    metadata: { ...p, id: productId }
                };

                // Default all dates to available; price_in_cents or base_price_in_cents
                const priceInCents = p.base_price_in_cents ?? p.price_in_cents ?? 0;
                const basePrice = priceInCents / 100;
                dates.forEach(date => {
                    item.availability[date] = { status: 'available', price: basePrice };
                });

                // Map plannings (JSONAPI) to this product
                const productPlannings = rawPlannings.filter((pl: any) => {
                    const plAttrs = pl.attributes || pl;
                    return String(plAttrs.product_id) === productId;
                });

                productPlannings.forEach((pl: any) => {
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
            console.error(`[BooqableAdapter] Error:`, error.response?.data || error.message);
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
