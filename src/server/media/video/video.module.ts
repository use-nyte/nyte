import { Module } from "@nestjs/common";
import { VideoService } from "./video.service";
import { VideoController } from "./video.controller";
import { FilesystemModule } from "../../filesystem/filesystem.module";

@Module({
	providers: [VideoService],
	controllers: [VideoController],
  imports: [FilesystemModule]
})
export class VideoModule {}
