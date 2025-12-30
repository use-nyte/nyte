import { Module } from "@nestjs/common";
import { FfmpegPathService } from "./ffmpeg-path.service";
import { FfmpegService } from "./ffmpeg.service";

@Module({
	providers: [FfmpegPathService, FfmpegService],
	exports: [FfmpegService]
})
export class FfmpegModule {}
