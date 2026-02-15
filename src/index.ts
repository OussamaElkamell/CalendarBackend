import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import { getAdapter } from "./adapters/registry.js";
import { getTenantConfig } from "./tenants/store.js";

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
        const tenantId = String(req.query.tenantId ?? req.query.tenant ?? "");
        const start = String(req.query.start ?? "");
        const end = String(req.query.end ?? "");

        if (!tenantId || !start || !end) {
            res.status(400).json({
                error: "Missing required parameters: tenantId (or tenant), start, end"
            });
            return;
        }

        // 1. Get the dynamic configuration for this tenant
        const config = getTenantConfig(tenantId);

        // 2. Resolve the correct adapter singleton
        const adapter = getAdapter(config.provider);

        // 3. Delegate data fetching to the adapter
        const data = await adapter.fetchAvailability(start, end, config);

        res.json(data);
    } catch (error: any) {
        console.error("Error fetching availability:", error);

        // Return appropriate status codes
        const status = error.message?.includes("Tenant not found") ? 404 : 500;
        res.status(status).json({ error: error.message || "Internal Server Error" });
    }
});

// Health check endpoint
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.listen(port, () => {
    console.log(`Backend provider listening at http://localhost:${port}`);
});
