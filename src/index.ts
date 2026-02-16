import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { getAdapter } from "./adapters/registry.js";
import { getTenantConfig } from "./tenants/store.js";
import type { AdapterConfig } from './types/grid.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Main endpoint for fetching availability
app.get("/api/v1/availability", async (req, res) => {
    try {
        // Support both 'tenantId' and 'tenant' query params for backwards compatibility
        const { start, end, provider, ...mapping } = req.query as any;

        if (!start || !end) {
            return res.status(400).json({ error: 'Missing start or end date (YYYY-MM-DD)' });
        }

        let config: AdapterConfig;

        if (provider) {
            // "Zero-Config" Mode: Config is built on-the-fly from URL parameters
            config = {
                tenantId: mapping.tenantId || mapping.tenant || 'dynamic',
                provider: provider as any,
                settings: mapping
            };
        } else {
            // Standard Mode: Config is retrieved from the centralized tenant store
            const tenantId = mapping.tenantId || mapping.tenant || 'demo';
            config = getTenantConfig(tenantId);
        }

        const adapter = getAdapter(config.provider);
        const data = await adapter.fetchAvailability(start, end, config);

        res.json(data);
    } catch (err: any) {
        console.error(`[API Error] ${req.path}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(port, () => {
    console.log(`Backend provider listening at http://localhost:${port}`);
});
