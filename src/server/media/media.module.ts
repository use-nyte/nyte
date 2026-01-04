import { Module } from "@nestjs/common";
import { FfmpegModule } from "../ffmpeg/ffmpeg.module";
import { FilesystemModule } from "../filesystem/filesystem.module";
import { VideoModule } from "../video/video.module";
import { MediaService } from "./media.service";

@Module({
	providers: [MediaService],
	controllers: [],
	imports: [FilesystemModule, FfmpegModule, VideoModule]
})
export class MediaModule {}
