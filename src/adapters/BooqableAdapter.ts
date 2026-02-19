import type { IAdapter } from "./IAdapter.js";
import type { GridResponse, AdapterConfig, GridItem, DayAvailability } from "../types/grid.js";
import axios from "axios";

/**
 * Booqable Adapter
 * Fetches products and availability (plannings) directly from Booqable API v4.
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
            // 1. Fetch Products
            const productsRes = await axios.get(`${baseUrl}/api/4/products`, {
                headers: authHeader,
                params: { "page[size]": 100 }
            });

            // 2. Fetch Plannings (Bookings/Reservations)
            // We fetch plannings that overlap with our range
            const planningsRes = await axios.get(`${baseUrl}/api/4/plannings`, {
                headers: authHeader,
                params: {
                    "filter[starts_at][lte]": endDate + "T23:59:59Z",
                    "filter[stops_at][gte]": startDate + "T00:00:00Z",
                    "page[size]": 1000
                }
            });

            const rawProducts = productsRes.data.products || [];
            const rawPlannings = planningsRes.data.plannings || [];
            const dates = this.generateDateRange(startDate, endDate);

            const items: GridItem[] = rawProducts.map((p: any) => {
                const item: GridItem = {
                    id: String(p.id),
                    name: p.name || "Unnamed Product",
                    image: p.photo_url || (p.photo && p.photo.base_url),
                    url: `${baseUrl}/products/${p.slug}`,
                    availability: {},
                    metadata: p
                };

                // Default all dates to available
                const basePrice = (p.price_in_cents || 0) / 100;
                dates.forEach(date => {
                    item.availability[date] = { status: 'available', price: basePrice };
                });

                // Map plannings to this product
                // Note: p.id is the product_id. In plannings, we look for product_id or item.product_id
                const productPlannings = rawPlannings.filter((pl: any) => String(pl.product_id) === item.id);

                productPlannings.forEach((pl: any) => {
                    const bStart = new Date(pl.starts_at);
                    const bEnd = new Date(pl.stops_at);

                    dates.forEach(date => {
                        const current = new Date(date);
                        // If the date falls within the reserved range
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
