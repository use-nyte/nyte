import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { VideoService } from "./video.service";
import path from "path";

@Controller("api/videos")
export class VideoController {
	constructor(private readonly videoService: VideoService) {}

	@Get()
	async getVideos(@Req() req: Request, @Res() res: Response) {
		const videos = await this.videoService.scanVideosInDirectory(
			this.videoService["configService"].get<string>("filesystem.mediaDirectory") || "/path/to/media"
		);
		res.json(videos);
	}

	@Get(":videoId")
	async getVideo(@Req() req: Request, @Res() res: Response) {
		const videoId = path.join(
			this.videoService["configService"].get<string>("filesystem.mediaDirectory") || "/path/to/media",
			req.params.videoId
		);
		const contentType = req.params.videoId.endsWith(".png") ? "image/png" : "video/mp4";
		const videoBuffer = await this.videoService.getVideo(videoId);
		res.setHeader("Content-Type", contentType);
		res.send(videoBuffer);
	}
}
