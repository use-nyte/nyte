import { Controller, Get, Next, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { VideoService } from "./video.service";

@Controller("api/videos")
export class VideoController {

    constructor(private readonly videoService: VideoService) {}

    @Get()
    async getVideos(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction) {
        this.videoService.scanVideosInDirectory(
            this.videoService['configService'].get<string>("filesystem.mediaDirectory") || "/path/to/media"
        ).then(videos => {
            res.json(videos);
        }).catch(error => {
            next(error);
        });
    }

}
