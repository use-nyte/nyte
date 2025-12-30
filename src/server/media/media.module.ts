import { Module } from "@nestjs/common";
import { FilesystemModule } from "../filesystem/filesystem.module";
import { FfmpegModule } from "../ffmpeg/ffmpeg.module";
import { MediaService } from "./media.service";
import { VideoModule } from "../video/video.module";

@Module({
	providers: [MediaService],
	controllers: [],
	imports: [FilesystemModule, FfmpegModule, VideoModule]
})
export class MediaModule {}
