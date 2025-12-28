import { All, Controller, Logger, Next, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { ReactRouterService } from "./react-router.service";
import { ReactRouterBuildError } from "./errors/react-router-build.error";
import { ReactRouterRenderError } from "./errors/react-router-render.error";

@Controller()
export class ReactRouterController {
	private readonly logger = new Logger(ReactRouterController.name);

	constructor(private readonly reactRouterService: ReactRouterService) {}

	@All("*")
	async render(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		if (
			req.path.startsWith("/api") ||
			req.path.startsWith("/assets") ||
			req.path === "/favicon.ico" ||
			req.path === "/robots.txt"
		) {
			return next();
		}

		if (!this.reactRouterService.isBuildReady()) {
			throw new ReactRouterBuildError();
		}

		try {
			const handler = this.reactRouterService.getHandler();

			const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
			const url = new URL(req.url, `${protocol}://${req.headers.host ?? "localhost"}`);
			const webRequest = new Request(url.toString(), {
				method: req.method,
				headers: new Headers(req.headers as HeadersInit),
				body: req.method !== "GET" && req.method !== "HEAD" ? JSON.stringify(req.body) : undefined
			});

			const webResponse = await handler(webRequest);

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
			throw new ReactRouterRenderError(error);
		}
	}
}
