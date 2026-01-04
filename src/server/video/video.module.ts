import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FfmpegModule } from "../ffmpeg/ffmpeg.module";
import { FilesystemModule } from "../filesystem/filesystem.module";
import { Video } from "./entities/video.entity";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";

@Module({
	providers: [VideoService],
	controllers: [VideoController],
	imports: [FilesystemModule, FfmpegModule, TypeOrmModule.forFeature([Video])],
	exports: [VideoService]
})
export class VideoModule {}
