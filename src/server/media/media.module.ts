import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { MediaService } from "./media.service";
import { VideoModule } from "./video/video.module";

@Module({
	providers: [MediaService],
	controllers: [MediaController],
	imports: [VideoModule]
})
export class MediaModule {}
