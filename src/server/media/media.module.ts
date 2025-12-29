import { Module } from "@nestjs/common";
import { FilesystemModule } from "../filesystem/filesystem.module";
import { FfmpegModule } from "../ffmpeg/ffmpeg.module";
import { MediaService } from "./media.service";

@Module({
    providers: [MediaService],
    controllers: [],
    imports: [FilesystemModule, FfmpegModule]
})
export class MediaModule {}
