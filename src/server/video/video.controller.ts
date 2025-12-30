import { Controller, Get, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { VideoService } from "./video.service";

@Controller("api/videos")
export class VideoController {
	private readonly CHUNK_SIZE = 10 ** 6; // 1MB

	constructor(private readonly videoService: VideoService) {}

	@Get()
	async getVideos(@Req() req: Request, @Res() res: Response) {
		const take = Number(req.query.take) || 20;
		const skip = Number(req.query.skip) || 0;
		const videos = await this.videoService.getAllVideos(take, skip);
		res.json(videos);
	}

	@Get(":videoId")
	async streamVideo(@Req() req: Request, @Res() res: Response) {
		const videoId = Number(req.params.videoId);
		const video = await this.videoService.getVideo(videoId);
		if (!video) {
			res.status(404).send("Video not found");
			return;
		}
		const range = req.headers.range;
		if (!range) {
			res.status(400).send("Requires Range header");
			return;
		}
		const rangeStart = Number(range.replace(/\D/g, ""));
		const rangeEnd = Math.min(rangeStart + this.CHUNK_SIZE, video.fileSize - 1);
		const contentLength = rangeEnd - rangeStart + 1;
		const readStream = this.videoService.streamVideo(video, {
			start: rangeStart,
			end: rangeEnd
		});
		res.writeHead(206, {
			"Content-Range": `bytes ${rangeStart}-${rangeEnd}/${video.fileSize}`,
			"Accept-Ranges": "bytes",
			"Content-Length": contentLength,
			"Content-Type": "video/mp4"
		});
		readStream.pipe(res);
	}
}
