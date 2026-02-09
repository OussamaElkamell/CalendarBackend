import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { MockAdapter } from './adapters/MockAdapter.js';
import type { IAdapter } from './adapters/IAdapter.js';
import type { AdapterConfig } from './types/grid.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// In a real multi-tenant app, this would come from a database based on tenantId
const getAdapterForTenant = (tenantId: string): { adapter: IAdapter, config: AdapterConfig } => {
    // Demo logic: if tenant is 'demo', use MockAdapter
    if (tenantId === 'demo') {
        return {
            adapter: new MockAdapter(),
            config: {
                tenantId: 'demo',
                provider: 'mock',
                settings: {}
            }
        };
    }

    throw new Error('Tenant not found');
};

app.get('/api/v1/availability', async (req, res) => {
    try {
        const { tenantId, start, end } = req.query;

        if (!tenantId || !start || !end) {
            res.status(400).json({ error: 'Missing required parameters: tenantId, start, end' });
            return;
        }

        const { adapter, config } = getAdapterForTenant(tenantId as string);
        const data = await adapter.fetchAvailability(start as string, end as string, config);

        res.json(data);
    } catch (error: any) {
        console.error('Error fetching availability:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.listen(port, () => {
    console.log(`Backend provider listening at http://localhost:${port}`);
});
