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
            },
            {
                id: 'item-4',
                name: 'City Penthouse',
                image: 'https://images.unsplash.com/photo-1502673530728-f79b4cab31b1?auto=format&fit=crop&w=800',
                url: '/details/item-4',
                availability: this.generateAvailability(dates, 300)
            },
            {
                id: 'item-5',
                name: 'Desert Eco Lodge',
                image: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=800',
                url: '/details/item-5',
                availability: this.generateAvailability(dates, 90)
            },
            {
                id: 'item-6',
                name: 'Lake House Retreat',
                image: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800',
                url: '/details/item-6',
                availability: this.generateAvailability(dates, 180)
            },
            {
                id: 'item-7',
                name: 'Countryside Farmhouse',
                image: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800',
                url: '/details/item-7',
                availability: this.generateAvailability(dates, 110)
            },
            {
                id: 'item-8',
                name: 'Modern Loft',
                image: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800',
                url: '/details/item-8',
                availability: this.generateAvailability(dates, 160)
            },
            {
                id: 'item-9',
                name: 'Forest Treehouse',
                image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=800',
                url: '/details/item-9',
                availability: this.generateAvailability(dates, 140)
            },
            {
                id: 'item-10',
                name: 'Historic Riad',
                image: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800',
                url: '/details/item-10',
                availability: this.generateAvailability(dates, 200)
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
