import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import type { Request, Response } from "express";
import { join } from "path";
import { pathToFileURL } from "url";

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

@Injectable()
export class ReactRouterService implements OnModuleInit {
	private readonly logger = new Logger(ReactRouterService.name, { timestamp: true });
	private build: ServerBuild | null = null;
	private buildLoaded = false;

	async onModuleInit() {
		await this.loadBuild();
	}

	private async loadBuild(): Promise<void> {
		try {
			const serverPath = join(__dirname, "..", "..", "web", "server", "index.mjs");
			const fileUrl = pathToFileURL(serverPath).href;
			this.logger.log(`Loading React Router build from: ${fileUrl}`);

			const imported: any = await import(fileUrl);
			this.build = imported as ServerBuild;
			this.buildLoaded = true;

			this.logger.log("React Router build loaded successfully");
		} catch (error) {
			this.logger.error("Failed to load React Router server build:", error);
			throw error;
		}
	}

	isBuildReady(): boolean {
		return this.buildLoaded && this.build !== null;
	}

	async handleRequest(req: Request, res: Response): Promise<void> {
		if (!this.isBuildReady()) {
			throw new Error("React Router build not loaded");
		}

		const { createRequestHandler } = await import("react-router");
		const handler = createRequestHandler(this.build as any);

		// Convert Express request to Web Request
		const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
		const webRequest = new Request(url.toString(), {
			method: req.method,
			headers: new Headers(req.headers as HeadersInit),
			body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined
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
	}
}
