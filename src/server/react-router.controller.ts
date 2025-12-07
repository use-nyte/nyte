import { Controller, All, Req, Res, Next } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { pathToFileURL } from 'url';

interface ServerBuild {
  routes: any;
  assets: any;
  entry: { module: { default: any } };
  basename?: string;
  publicPath?: string;
  assetsBuildDirectory?: string;
  future?: any;
  isSpaMode?: boolean;
  ssr?: boolean;
  prerender?: any[];
  routeDiscovery?: boolean;
}

@Controller()
export class ReactRouterController {
  private build: ServerBuild | null = null;
  private handlerPromise: Promise<void>;

  constructor() {
    this.handlerPromise = this.initHandler();
  }

  private async initHandler() {
    try {
      const serverPath = join(__dirname, '..', 'web', 'server', 'index.js');
      const fileUrl = pathToFileURL(serverPath).href;
      console.log('Loading React Router build from:', fileUrl);

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const imported: any = await import(fileUrl);
      this.build = imported as ServerBuild;

      console.log('✓ React Router build loaded successfully');
    } catch (error) {
      console.error('Failed to load React Router server build:', error);
    }
  }

  @All('*')
  async render(
    @Req() req: Request,
    @Res() res: Response,
    @Next() next: NextFunction,
  ) {
    // Skip API routes and static assets
    if (req.path.startsWith('/api') || req.path.startsWith('/assets')) {
      return next();
    }

    // Wait for build to initialize
    await this.handlerPromise;

    if (!this.build) {
      console.error('React Router build not loaded');
      return res.status(500).send('React Router server not initialized');
    }

    try {
      const { createRequestHandler } = await import('react-router');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const handler = createRequestHandler(this.build as any);

      // Convert Express request to Web Request
      const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
      const webRequest = new Request(url.toString(), {
        method: req.method,
        headers: new Headers(req.headers as HeadersInit),
        body:
          req.method !== 'GET' && req.method !== 'HEAD'
            ? JSON.stringify(req.body)
            : undefined,
      });

      const webResponse = await handler(webRequest);

      // Convert Web Response to Express response
      res.status(webResponse.status);
      webResponse.headers.forEach((value, key) => {
        res.setHeader(key, value);
      });

      if (webResponse.body) {
        const reader = webResponse.body.getReader();
        const pump = async () => {
          const { done, value } = await reader.read();
          if (done) {
            res.end();
            return;
          }
          res.write(value);
          return pump();
        };
        await pump();
      } else {
        res.end();
      }
    } catch (error) {
      console.error('React Router rendering error:', error);
      return res.status(500).send('Failed to render page');
    }
  }
}
