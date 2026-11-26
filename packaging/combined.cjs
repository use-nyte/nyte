const { accessSync, constants } = require("node:fs");
const { extname, join } = require("node:path");
const { ConsoleLogger, Logger } = require("./server/node_modules/@nestjs/common");
const { NestFactory } = require("./server/node_modules/@nestjs/core");
const { AppModule } = require("./server/dist/app.module");

/** Starts the pinned server module and serves the pinned browser build from the same origin. */
async function bootstrap() {
  const host = process.env.HOST ?? "127.0.0.1";
  const port = Number(process.env.PORT ?? "52470");
  const webRoot = join(__dirname, "web");
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
