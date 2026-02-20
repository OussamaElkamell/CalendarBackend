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

// Create a Booqable storefront cart using their v1 cart API (same API as their embed JS snippet)
// This returns cart.cart_url — the actual working checkout redirect URL
app.post("/api/v1/createCart", async (req, res) => {
    try {
        const { source, apiKey, productId, startDate, endDate, storeUrl } = req.body;

        if (!source || !apiKey || !productId || !startDate || !endDate) {
            return res.status(400).json({
                error: 'Missing required fields: source, apiKey, productId, startDate, endDate'
            });
        }

        const storefront = (storeUrl || source as string).replace(/\/$/, '');
        const authHeader = { Authorization: `Bearer ${apiKey}` };
        const axios = (await import('axios')).default;

        // Step 1: Create a Booqable storefront cart
        // This is the same endpoint used by booqable.js embed snippet (CARTS_FETCH action)
        const cartRes = await axios.post(
            `${storefront}/api/1/cart`,
            { source: 'store' },
            { headers: { ...authHeader, 'Content-Type': 'application/json' } }
        );

        const cart = cartRes.data?.cart;
        const cartId: string = cart?.id;
        if (!cartId) throw new Error('Failed to create Booqable storefront cart — no ID returned');
        console.log('[createCart] Cart created:', cartId);

        // Step 2: Set rental dates on the cart (mirrors CARTS_UPDATE action)
        await axios.put(
            `${storefront}/api/1/cart`,
            {
                id: cartId,
                starts_at: `${startDate}T10:00:00.000Z`,
                stops_at: `${endDate}T10:00:00.000Z`,
            },
            { headers: { ...authHeader, 'Content-Type': 'application/json' } }
        );

        // Step 3: Book the product into the cart (mirrors CARTS_BOOK action)
        const bookRes = await axios.post(
            `${storefront}/api/1/cart/book`,
            {
                id: cartId,
                item_id: productId,
                quantity: 1,
            },
            { headers: { ...authHeader, 'Content-Type': 'application/json' } }
        );

        // Step 4: Get the cart_url — Booqable's cart object includes a cart_url field
        const bookedCart = bookRes.data?.cart;
        const cartUrl: string = bookedCart?.cart_url
            || cart?.cart_url
            || `${storefront}/cart`;

        console.log('[createCart] Product booked. Cart URL:', cartUrl);
        console.log('[createCart] Order ID:', bookedCart?.order_id);

        res.json({
            cartUrl,
            cartId,
            orderId: bookedCart?.order_id,
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
