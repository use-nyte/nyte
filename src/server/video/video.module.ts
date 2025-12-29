import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { VideoController } from "./video.controller";
import { FilesystemModule } from "../filesystem/filesystem.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Video } from "./entities/video.entity";

@Module({
	providers: [VideoService],
	controllers: [VideoController],
	imports: [FilesystemModule, TypeOrmModule.forFeature([Video])]
})
export class VideoModule {}
