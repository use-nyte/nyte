import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module.js";
import { createProxyMiddleware } from "http-proxy-middleware";
import { ConsoleLogger } from "@nestjs/common";
import { NyteExceptionFilter } from "./common/filters/nyte-exception.filter.js";

const isDevelopment = process.env.NODE_ENV !== "production";

void (async () => {
	const app = await NestFactory.create(AppModule, {
		logger: new ConsoleLogger({
			prefix: "Nyte"
		})
	});

	// Trust proxy headers (for nginx/reverse proxy)
	const expressInstance = app.getHttpAdapter().getInstance();
	expressInstance.set("trust proxy", true);

	// Register global exception filter
	app.useGlobalFilters(new NyteExceptionFilter());

	const configService = app.get(ConfigService);
	const port = configService.get<number>("port") ?? 3000;
	const corsOrigin = configService.get<string>("cors.origin");

	app.enableCors({
		origin: corsOrigin,
		credentials: true
	});

	// In development, proxy non-API requests to Vite
	if (isDevelopment) {
		app.use(
			createProxyMiddleware({
				target: "http://localhost:5173",
				changeOrigin: true,
				ws: true,
				pathFilter: (path) => !path.startsWith("/api")
			})
		);
	}

	await app.listen(port, "0.0.0.0");
})();
