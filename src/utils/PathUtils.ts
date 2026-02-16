/**
 * Resolves a value from a nested object using dot notation (e.g., "attributes.price.amount").
 */
export function getDeepValue(obj: any, path: string | undefined): any {
    if (!obj || !path) return undefined;

    // Support simple property access
    if (!path.includes('.')) return obj[path];

    return path.split('.').reduce((acc, part) => {
        return acc && acc[part] !== undefined ? acc[part] : undefined;
    }, obj);
}

/**
 * Attempts to find a value for a key by looking for common aliases if the primary path fails.
 */
export function guessValue(obj: any, aliases: string[]): any {
    if (!obj) return undefined;
    for (const alias of aliases) {
        if (obj[alias] !== undefined) return obj[alias];
    }
    return undefined;
}

/**
 * Common field aliases for auto-discovery
 */
export const ALIASES = {
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
