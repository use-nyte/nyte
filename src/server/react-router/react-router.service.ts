import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { join } from "path";
import { createRequestHandler } from "react-router";
import { pathToFileURL } from "url";
import { ReactRouterBuildError } from "./errors/react-router-build.error";
import { ReactRouterModuleLoadError } from "./errors/react-router-module-load.error";

/* eslint-disable @typescript-eslint/no-explicit-any */
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
/* eslint-enable @typescript-eslint/no-explicit-any */

@Injectable()
export class ReactRouterService implements OnModuleInit {
	private build: ServerBuild | null = null;
	private buildLoaded = false;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private handler: any = null;
	private readonly logger = new Logger(ReactRouterService.name);

	isBuildReady(): boolean {
		return this.buildLoaded && this.build !== null && this.handler !== null;
	}

	async onModuleInit() {
		await this.loadBuild();
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	getHandler(): any {
		if (!this.isBuildReady()) {
			throw new ReactRouterBuildError();
		}
		return this.handler;
	}

	private async loadBuild(): Promise<void> {
		const serverPath = pathToFileURL(join(process.cwd(), "dist", "web", "server", "index.mjs")).href;
		try {
			this.logger.log(`Loading React Router build from: ${serverPath}`);

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const imported: any = await import(serverPath);
			this.build = imported as ServerBuild;
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			this.handler = createRequestHandler(this.build as any);
			this.buildLoaded = true;

			this.logger.log("React Router build loaded successfully");
		} catch (error) {
			throw new ReactRouterModuleLoadError(serverPath, error);
		}
	}
}
