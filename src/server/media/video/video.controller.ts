import { Controller, Get, Next, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { VideoService } from "./video.service";
import path from "path";

@Controller("api/videos")
export class VideoController {
	constructor(private readonly videoService: VideoService) {}

	@Get()
	async getVideos(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		this.videoService
			.scanVideosInDirectory(
				this.videoService["configService"].get<string>("filesystem.mediaDirectory") || "/path/to/media"
			)
			.then((videos) => {
				res.json(videos);
			})
			.catch((error) => {
				next(error);
			});
	}

	@Get(":videoId")
	async getVideo(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
		const videoId = path.join(
			this.videoService["configService"].get<string>("filesystem.mediaDirectory") || "/path/to/media",
			req.params.videoId
		);
		const contentType = req.params.videoId.endsWith(".png") ? "image/png" : "video/mp4";
		this.videoService
			.getVideo(videoId)
			.then((videoBuffer) => {
				res.setHeader("Content-Type", contentType);
				res.send(videoBuffer);
			})
			.catch((error) => {
				next(error);
			});
	}
}
