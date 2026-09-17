import cors from "cors";
import "dotenv/config";
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { fixtureFlow, fixtureResolution, fixtureTokenInformation } from "./fixtures/data.js";
import { deriveSignal } from "./intelligence/signals.js";
import { NansenApiError, NansenClient } from "./nansen/client.js";

const chains = (process.env.CHAINS ?? "ethereum,base,solana,sui,bnb,arbitrum,robinhood")
  .split(",")
  .map((chain) => chain.trim().toLowerCase())
  .filter(Boolean);
const fixtureMode = process.env.DEV_USE_FIXTURES === "true";
const client = new NansenClient(process.env.NANSEN_API_KEY ?? "", chains);

const resolveSchema = z.object({
  identifier: z.string().min(2).max(128),
  kind: z.enum(["cashtag", "contract"]),
  addressFormat: z.enum(["evm", "solana", "sui"]).optional()
});

const intelligenceSchema = z.object({
  chain: z.string().min(2).max(32),
  address: z.string().min(8).max(128),
  symbol: z.string().min(1).max(32),
  name: z.string().max(100).optional()
});

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(
    cors({
      origin(origin, callback) {
        const allowed =
          !origin ||
          origin.startsWith("chrome-extension://") ||
          origin === "https://x.com" ||
          origin === "https://twitter.com" ||
          /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/.test(origin);
        callback(allowed ? null : new Error("Origin is not allowed."), allowed);
      },
      methods: ["GET", "POST"]
    })
  );
  app.use(express.json({ limit: "12kb" }));

  app.get("/health", (_request, response) => {
    response.json({ ok: true });
  });

  app.get("/api/status", async (_request, response, next) => {
    try {
      const connected = fixtureMode ? true : await client.verifyConnection();
      response.json({
        connected,
        fixtureMode,
        ...client.getUsage()
      });
    } catch (error) {
      if (error instanceof NansenApiError && [401, 402, 403].includes(error.status)) {
        response.json({ connected: false, fixtureMode, ...client.getUsage() });
        return;
      }
      next(error);
    }
  });

  app.post("/api/resolve", async (request, response, next) => {
    try {
      const input = resolveSchema.parse(request.body);
      const result = fixtureMode ? fixtureResolution(input.identifier) : await client.resolveToken(input);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/intelligence", async (request, response, next) => {
    try {
      const token = intelligenceSchema.parse(request.body);
      let flow;
      let information;
      if (fixtureMode) {
        flow = fixtureFlow(token.address);
        information = fixtureTokenInformation(token.address);
      } else {
        const [flowResult, informationResult] = await Promise.allSettled([
          client.getFlowIntelligence(token.chain, token.address),
          client.getTokenInformation(token.chain, token.address)
        ]);
        flow = flowResult.status === "fulfilled" ? flowResult.value : null;
        information = informationResult.status === "fulfilled" ? informationResult.value : null;
        if (flowResult.status === "rejected" && informationResult.status === "rejected") {
          throw flowResult.reason;
        }
      }
      const metrics = flow ?? {
        smartTraderNetflowUsd: null,
        smartTraderAvgFlowUsd: null,
        smartTraderWalletCount: null,
        whaleNetflowUsd: null,
        whaleAvgFlowUsd: null,
        whaleWalletCount: null,
        exchangeNetflowUsd: null,
        exchangeAvgFlowUsd: null,
        freshWalletNetflowUsd: null,
        freshWalletAvgFlowUsd: null,
        publicFigureNetflowUsd: null,
        publicFigureAvgFlowUsd: null,
        publicFigureWalletCount: null,
        topPnlNetflowUsd: null,
        topPnlAvgFlowUsd: null,
        topPnlWalletCount: null,
        warnings: []
      };
      response.json({
        token: {
          ...token,
          symbol: information?.symbol ?? token.symbol,
          name: information?.name ?? token.name
        },
        snapshot: information?.snapshot ?? null,
        timeframe: "1d",
        ...metrics,
        signal: deriveSignal(metrics),
        updatedAt: new Date().toISOString(),
        source: fixtureMode ? "fixture" : "nansen"
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
    console.error(error);
    if (error instanceof z.ZodError) {
      response.status(400).json({ message: "The token request was not valid." });
      return;
    }
    if (error instanceof NansenApiError) {
      const status = error.status === 429 ? 429 : error.status >= 500 ? 502 : error.status;
      response.status(status).json({
        message:
          error.code === "not_configured"
            ? "Nansen isn’t connected. Configure the server API key."
            : error.status === 429
              ? "Nansen is busy. Try again shortly."
              : "Nansen data is unavailable right now."
      });
      return;
    }
    response.status(500).json({ message: "The intelligence service hit an unexpected error." });
  });
  return app;
}

const port = Number(process.env.PORT ?? 8787);

if (process.env.NODE_ENV !== "test") {
  createApp().listen(port, () => {
    console.log(`Dawn server listening on http://localhost:${port}`);
    if (fixtureMode) console.warn("DEV_USE_FIXTURES is active. Responses will be marked DEV DATA.");
  });
}
