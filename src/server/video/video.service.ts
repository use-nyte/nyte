import { Injectable, Logger } from "@nestjs/common";
import { FilesystemService } from "../filesystem/filesystem.service";
import { ConfigService } from "@nestjs/config";
import { VideoReadError } from "./errors/video-read.error";
import { ScanDirectoryOptions } from "../filesystem/types/scan-directory-options.type";

@Injectable()
export class VideoService {
	private readonly logger = new Logger(VideoService.name, { timestamp: true });

	constructor(
		private readonly configService: ConfigService,
		private readonly filesystemService: FilesystemService
	) {}

	async scanVideosInDirectory(directoryPath: string, options?: ScanDirectoryOptions): Promise<string[]> {
		return this.filesystemService.scanDirectory(directoryPath, {
			recursive: options?.recursive ?? true,
			filterFileTypes: options?.filterFileTypes ?? [".mp4", ".mkv", ".avi", ".mov"]
		});
	}

	async getVideo(videoPath: string): Promise<Buffer> {
		return this.filesystemService
			.getFile(videoPath)
			.then(
				function handleVideoReadSuccess(data: Buffer) {
					return data;
				}.bind(this)
			)
			.catch(
				function handleVideoReadError(error: Error) {
					throw new VideoReadError(videoPath, error);
				}.bind(this)
			);
	}
}
