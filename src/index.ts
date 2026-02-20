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

// Create a Booqable cart (draft order + book product) and return the cart URL
app.post("/api/v1/createCart", async (req, res) => {
    try {
        const { source, apiKey, productId, startDate, endDate, storeUrl } = req.body;

        if (!source || !apiKey || !productId || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing required fields: source, apiKey, productId, startDate, endDate'
            });
        }

        const baseUrl = (source as string).replace(/\/$/, '');
        const authHeader = { Authorization: `Bearer ${apiKey}` };
        const axios = (await import('axios')).default;

        // Step 1: Create a draft order with the rental period
        const orderRes = await axios.post(
            `${baseUrl}/api/4/orders`,
            {
                data: {
                    type: 'orders',
                    attributes: {
                        starts_at: `${startDate}T10:00:00.000Z`,
                        stops_at: `${endDate}T10:00:00.000Z`,
                        status: 'new'
                    }
                }
            },
            { headers: { ...authHeader, 'Content-Type': 'application/json' } }
        );

        const orderId: string = orderRes.data?.data?.id;
        if (!orderId) throw new Error('Failed to create Booqable order — no ID returned');

        // Step 2: Book the product onto the order
        await axios.post(
            `${baseUrl}/api/4/order_fulfillments`,
            {
                data: {
                    type: 'order_fulfillments',
                    attributes: {
                        order_id: orderId,
                        actions: [
                            {
                                action: 'book_product',
                                mode: 'create_new',
                                product_id: productId,
                                quantity: 1
                            }
                        ]
                    }
                }
            },
            { headers: { ...authHeader, 'Content-Type': 'application/json' } }
        );


        const storefront = (storeUrl || source as string).replace(/\/$/, '');
        const cartUrl = `${storefront}/orders/${orderId}`;
        const orderAttrs = orderRes.data?.data?.attributes || {};

        console.log('[createCart] Order created:', orderId);
        console.log('[createCart] Cart URL:', cartUrl);
        console.log('[createCart] Order status:', orderAttrs.status, '| starts_at:', orderAttrs.starts_at);

        res.json({
            cartUrl,
            orderId,
            orderNumber: orderAttrs.number,
            orderStatus: orderAttrs.status,
        });
    } catch (err: any) {
        const detail = err.response?.data || err.message;
        console.error('[createCart] Error:', detail);
        res.status(500).json({ error: 'Failed to create Booqable cart', detail });
    }
});

app.listen(port, () => {
    console.log(`Backend provider listening at http://localhost:${port}`);
});
