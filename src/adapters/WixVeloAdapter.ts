import type { IAdapter } from "./IAdapter.js";
import type { GridResponse, AdapterConfig, GridItem, DayAvailability } from "../types/grid.js";
import axios from "axios";

/**
 * Common field aliases for auto-discovery
 */
const ALIASES = {
    id: ['id', '_id', 'uuid', 'pk', 'uId'],
    name: ['name', 'title', 'label', 'display_name', 'fileName', 'carName'],
    image: ['image', 'img', 'photo', 'thumbnail', 'pic', 'carImage'],
    url: ['url', 'link', 'href', 'website'],
    price: ['price', 'amount', 'cost', 'rate', 'value'],
    startDate: ['startDate', 'start', 'from', 'reservationDate', 'checkIn'],
    endDate: ['endDate', 'end', 'to', 'checkOut'],
    unitId: ['unitId', 'resourceId', 'itemId', 'carId', 'refId'],
    status: ['status', 'state', 'availability', 'confirmed']
};

/**
 * Resolves a value from a nested object using dot notation.
 */
function getDeepValue(obj: any, path: string | undefined): any {
    if (!obj || !path) return undefined;
    if (!path.includes('.')) return obj[path];
    return path.split('.').reduce((acc, part) => {
        return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
}

/**
 * Attempts to find a value for a key by looking for common aliases.
 */
function guessValue(obj: any, aliases: string[]): any {
    if (!obj) return undefined;
    for (const alias of aliases) {
        if (obj[alias] !== undefined) return obj[alias];
    }
    return undefined;
}

/**
 * Universal Adapter for any REST API (Wix, custom, etc.)
 * it normalizes arbitrary JSON into GridResponse using flexible path-based mapping.
 */
export class WixVeloAdapter implements IAdapter {
    async fetchAvailability(
        startDate: string,
        endDate: string,
        config: AdapterConfig
    ): Promise<GridResponse> {
        const {
            source,
            wix_fn = "calendar_data",
            units_path = config.settings.units_path || config.settings.units || "units",
            bookings_path = config.settings.bookings_path || config.settings.bookings || "bookings",
            unit_id,
            unit_name,
            unit_image,
            unit_url,
            unit_price,
            booking_unitId,
            booking_start,
            booking_end,
            booking_status,
            status_booked = "confirmed"
        } = config.settings;

        if (!source) {
            throw new Error("Adapter requires 'source' parameter");
        }

        const isWix = config.provider === 'wix';
        const url = isWix
            ? `${source.replace(/\/$/, "")}/_functions/${wix_fn}`
            : source;

        try {
            const response = await axios.get(url, {
                params: {
                    start: startDate,
                    end: endDate,
                    ...config.settings
                }
            });

            const data = response.data;
            const rawUnits = getDeepValue(data, units_path) || (Array.isArray(data) ? data : []);
            const globalBookings = getDeepValue(data, bookings_path) || [];

            if (!Array.isArray(rawUnits)) {
                throw new Error(`Units not found at path: ${units_path}. Verify your mapping.`);
            }

            const dates = this.generateDateRange(startDate, endDate);

            const items: GridItem[] = rawUnits.map((unit: any) => {
                const item: GridItem = {
                    id: String(getDeepValue(unit, unit_id) || guessValue(unit, ALIASES.id)),
                    name: String(getDeepValue(unit, unit_name) || guessValue(unit, ALIASES.name) || "Unnamed"),
                    image: getDeepValue(unit, unit_image) || guessValue(unit, ALIASES.image),
                    url: getDeepValue(unit, unit_url) || guessValue(unit, ALIASES.url),
                    availability: {},
                    metadata: unit
                };

                const basePrice = Number(getDeepValue(unit, unit_price) || guessValue(unit, ALIASES.price)) || 0;
                dates.forEach(date => {
                    item.availability[date] = { status: 'available', price: basePrice };
                });

                const nestedBookings = getDeepValue(unit, bookings_path) || getDeepValue(unit, 'bookings');
                const unitBookings = Array.isArray(nestedBookings)
                    ? nestedBookings
                    : globalBookings.filter((b: any) => String(getDeepValue(b, booking_unitId) || guessValue(b, ALIASES.unitId)) === item.id);

                unitBookings.forEach((booking: any) => {
                    const startRaw = getDeepValue(booking, booking_start) || guessValue(booking, ALIASES.startDate);
                    let endRaw = getDeepValue(booking, booking_end) || guessValue(booking, ALIASES.endDate);
                    const status = getDeepValue(booking, booking_status) || guessValue(booking, ALIASES.status);

                    if (!startRaw) return;

                    if (!endRaw) {
                        const sDate = new Date(startRaw);
                        const eDate = new Date(sDate);
                        eDate.setDate(eDate.getDate() + 1);
                        endRaw = eDate.toISOString();
                    }

                    const bStart = new Date(startRaw);
                    const bEnd = new Date(endRaw);

                    if (!status || String(status).toLowerCase() === status_booked.toLowerCase()) {
                        dates.forEach(date => {
                            const current = new Date(date);
                            if (current >= bStart && current < bEnd && item.availability[date]) {
                                (item.availability[date] as DayAvailability).status = 'booked';
                            }
                        });
                    }
                });

                return item;
            });

            return { version: "1.0", dates, items };

        } catch (error: any) {
            console.error(`[UniversalAdapter] Error mapping data from ${url}:`, error.message);
            throw new Error(`Integration Error: ${error.message}`);
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
