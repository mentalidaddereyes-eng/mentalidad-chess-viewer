import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser()); // feat(subscriptions): for plan mode cookies

// v7.0: Serve attached_assets statically (for eco.min.json, puzzles.sample.json, etc)
app.use(express.static(path.join(process.cwd(), 'attached_assets')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  let port = parseInt(process.env.PORT || '5000', 10);

  // On Windows, `reusePort` is not supported and will cause listen errors.
  // Only set reusePort when it's supported (non-Windows platforms).
  const baseListenOptions: any = { host: "0.0.0.0" };

  // Try to bind to the configured port; if it's in use, increment and retry
  // a few times so local development won't fail when a port is occupied.
  const maxRetries = 5;
  let attempt = 0;

  const tryListen = (p: number) => {
    const listenOptions: any = { ...baseListenOptions, port: p };
    if (process.platform !== 'win32') {
      listenOptions.reusePort = true;
    }

    // Attach a one-time error handler for this attempt
    const onError = (err: any) => {
      if (err && err.code === 'EADDRINUSE' && attempt < maxRetries) {
        log(`port ${p} in use, trying port ${p + 1} (attempt ${attempt + 1}/${maxRetries})`);
        attempt++;
        // small delay before retrying to avoid racing issues
        setTimeout(() => tryListen(p + 1), 200);
      } else {
        // no more retries or different error — rethrow so it surfaces
        throw err;
      }
    };

    server.once('error', onError);

    server.listen(listenOptions, () => {
      // remove the error listener for this attempt after successful listen
      server.removeListener('error', onError);
      log(`serving on port ${p}`);
    });
  };

  tryListen(port);
})();
