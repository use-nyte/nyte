import { ConsoleLogger, Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { accessSync, constants } from "node:fs";
import { extname, join } from "node:path";
import { AppModule } from "./dist/app.module.js";

/** Starts the pinned server module and serves the pinned browser build from the same origin. */
async function bootstrap() {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? "52470");
  const webRoot = join(import.meta.dirname, "..", "web");
  const indexFile = join(webRoot, "index.html");

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }
  accessSync(indexFile, constants.R_OK);

  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ prefix: "Nyte", timestamp: true })
  });

  app.useStaticAssets(webRoot);
  app.use((request, response, next) => {
    const reservedPath = /^\/(api|health|assets)(\/|$)/.test(request.path);
    if (request.method === "GET" && request.accepts("html") && !extname(request.path) && !reservedPath) {
      response.sendFile(indexFile);
      return;
    }
    next();
  });
  app.enableShutdownHooks();
  await app.listen(port, host);
  new Logger("Bootstrap").log(`Nyte listening on ${host}:${port}`);
}

void bootstrap().catch((error) => {
  new Logger("Bootstrap").error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exitCode = 1;
});
