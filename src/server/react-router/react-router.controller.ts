import { All, Controller, Logger, Next, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ReactRouterService } from "./react-router.service";

@Controller()
export class ReactRouterController {
	private readonly logger = new Logger(ReactRouterController.name);

	constructor(private readonly reactRouterService: ReactRouterService) {}

	@All("*")
	async render(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		// Skip API routes and static assets
		if (req.path.startsWith("/api") || req.path.startsWith("/assets") || req.path === "/favicon.ico") {
			return next();
		}

		if (!this.reactRouterService.isBuildReady()) {
			this.logger.error("React Router build not loaded");
			return res.status(500).send("React Router server not initialized");
		}

		try {
			await this.reactRouterService.handleRequest(req, res);
		} catch (error) {
			this.logger.error("React Router rendering error:", error);
			return res.status(500).send("Failed to render page");
		}
	}
}
