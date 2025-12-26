import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { FilesystemService } from "../../filesystem/filesystem.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class VideoService implements OnModuleInit {
    private readonly logger = new Logger(VideoService.name, { timestamp: true });

    constructor(
        private readonly configService: ConfigService,
        private readonly filesystemService: FilesystemService
    ) {}

	async onModuleInit() {
        const videos = await this.scanVideosInDirectory(this.configService.get<string>("filesystem.mediaDirectory") || "/path/to/media");
        console.table(videos);
    }

	scanVideosInDirectory(directoryPath: string): Promise<string[]> {
        return this.filesystemService.scanDirectory(directoryPath, {
            recursive: true,
            filterFileTypes: [".mp4", ".avi", ".mkv", ".usm"]
        });
    }
}
