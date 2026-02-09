import type { IAdapter } from './IAdapter.js';
import type { GridResponse, AdapterConfig, GridItem, DayAvailability } from '../types/grid.js';

export class MockAdapter implements IAdapter {
    async fetchAvailability(startDate: string, endDate: string, config: AdapterConfig): Promise<GridResponse> {
        const dates = this.generateDateRange(startDate, endDate);

        const items: GridItem[] = [
            {
                id: 'item-1',
                name: 'Luxury Villa',
                image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=800',
                url: '/details/item-1',
                availability: this.generateAvailability(dates, 250)
            },
            {
                id: 'item-2',
                name: 'Mountain Cabin',
                image: 'https://images.unsplash.com/photo-1464146072230-91cabc968266?auto=format&fit=crop&w=800',
                url: '/details/item-2',
                availability: this.generateAvailability(dates, 150)
            },
            {
                id: 'item-3',
                name: 'Beachfront Studio',
                image: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800',
                url: '/details/item-3',
                availability: this.generateAvailability(dates, 120)
            }
        ];

        return {
            version: '1.0',
            dates,
            items,
            metadata: {
                currency: 'USD',
                timezone: 'UTC'
            }
        };
    }

    private generateDateRange(startStr: string, endStr: string): string[] {
        const start = new Date(startStr);
        const end = new Date(endStr);
        const dates: string[] = [];

        let current = new Date(start);
        while (current <= end) {
            const isoString = current.toISOString();
            const datePart = isoString.split('T')[0];
            if (datePart) {
                dates.push(datePart);
            }
            current.setDate(current.getDate() + 1);
        }

        return dates;
    }

    private generateAvailability(dates: string[], basePrice: number): Record<string, DayAvailability> {
        const availability: Record<string, DayAvailability> = {};

        dates.forEach(date => {
            const dateObj = new Date(date);
            const dayNum = dateObj.getDate();

            // Scatter statuses for a more natural look
            let status: 'available' | 'booked' | 'unavailable' | 'pending' = 'available';

            // Just some arbitrary but stable patterns based on date and basePrice (used as seed)
            const seed = (dayNum + basePrice) % 31;

            if (seed === 5 || seed === 12 || seed === 25) {
                status = 'booked';
            } else if (seed === 18) {
                status = 'unavailable';
            }

            availability[date] = {
                status,
                price: basePrice + (dayNum % 7 === 0 || dayNum % 7 === 6 ? 50 : 0), // Higher price on weekends
                remaining: status === 'available' ? 5 : 0
            };
        });

        return availability;
    }
}
