import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import path from "path";
import { OnApplicationStart } from "../common/interfaces/on-application-start.interface";
import { FfmpegService } from "../ffmpeg/ffmpeg.service";
import { FilesystemService } from "../filesystem/filesystem.service";
import { VideoService } from "../video/video.service";

@Injectable()
export class MediaService implements OnApplicationStart {
	private readonly logger = new Logger(MediaService.name, { timestamp: true });

	constructor(
		private readonly configService: ConfigService,
		private readonly filesystemService: FilesystemService,
		private readonly ffmpegService: FfmpegService,
		private readonly videoService: VideoService
	) {}

	async indexMediaDirectory(): Promise<void> {
		const mediaDir = this.configService.get<string>("filesystem.mediaDirectory");
		if (!mediaDir) {
			throw new Error("MEDIA_DIRECTORY is not configured.");
		}

		const fileIndexer = this.filesystemService.scanDirectoryGenerator(mediaDir, {
			recursive: true
		});

		for await (const filePath of fileIndexer) {
			if (!this.ffmpegService.isFormatSupported(path.extname(filePath))) {
				continue;
			}

			const metadata = await this.ffmpegService.getFileMetadata(filePath);

			if (this.ffmpegService.isVideoFile(metadata)) {
				this.videoService.indexVideoFile(filePath);
				continue;
			}

			if (this.ffmpegService.isAudioFile(metadata)) {
				continue;
			}

			if (this.ffmpegService.isImageFile(metadata)) {
				continue;
			}

			if (this.ffmpegService.isGifFile(metadata)) {
				continue;
			}

			// this.logger.debug(`Unsupported media file skipped: ${filePath}`);
			// console.log(metadata);
		}
	}

	async onApplicationStart(): Promise<void> {
		this.logger.log("Starting media indexing...");
		this.logger.warn("Media indexing can take a while depending on the size of your media library.");
		this.logger.debug("This process will eventually be moved to a background job.");
		await this.indexMediaDirectory();
		this.logger.log("Media indexing completed.");
	}
}
