import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import { createProxyMiddleware } from 'http-proxy-middleware';

const isDevelopment = process.env.NODE_ENV !== 'production';

void (async () => {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  const corsOrigin = configService.get<string>('cors.origin');

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  // In development, proxy non-API requests to Vite
  if (isDevelopment) {
    app.use(
      createProxyMiddleware({
        target: 'http://localhost:5173',
        changeOrigin: true,
        ws: true,
        pathFilter: (path) => !path.startsWith('/api'),
      }),
    );
  }

  await app.listen(port);
  console.log(`🚀 Nyte server running on http://localhost:${port}`);

  if (isDevelopment) {
    console.log(`📦 Start Vite with: pnpm dev:web`);
    console.log(`🏥 Health check: http://localhost:${port}/api/health`);
  }
})();
