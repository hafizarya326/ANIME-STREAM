import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import apiRouter from "./routes/api.js";
import { ApiError, formatError } from "./lib/errors.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: "*",
  })
);
app.use(compression());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    legacyHeaders: false,
    standardHeaders: true,
    message: { error: { code: "BAD_REQUEST", message: "Too many requests", details: {} } },
  })
);

app.get("/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1", apiRouter);

// Not found handler
app.use((_req, res) => res.status(404).json(formatError(new ApiError("NOT_FOUND", "Not found"))));

// Error handler
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const payload = formatError(err);
const status =
  payload.error.code === "BAD_REQUEST"
    ? 400
    : payload.error.code === "NOT_FOUND"
        ? 404
        : payload.error.code === "UPSTREAM_FORBIDDEN"
          ? 403
          : 500;
  res.status(status).json(payload);
});

const port = Number(process.env.PORT || 3002);
app.listen(port, () => {
  console.log(`API BFF listening on http://localhost:${port}`);
});
