import { Module } from "@nestjs/common";
import { FfmpegDownloaderService } from "./ffmpeg-downloader.service";
import { FfmpegService } from "./ffmpeg.service";

@Module({
    providers: [FfmpegDownloaderService, FfmpegService],
    exports: [FfmpegService]
})
export class FfmpegModule {}
