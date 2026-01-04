import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FfmpegService } from "../ffmpeg/ffmpeg.service";
import { FilesystemService } from "../filesystem/filesystem.service";
import { Video } from "./entities/video.entity";
import { VideoReadError } from "./errors/video-read.error";

@Injectable()
export class VideoService {
	private readonly logger = new Logger(VideoService.name, { timestamp: true });

	constructor(
		private readonly configService: ConfigService,
		private readonly filesystemService: FilesystemService,
		private readonly ffmpegService: FfmpegService,
		@InjectRepository(Video)
		private readonly videoRepository: Repository<Video>
	) {}

	async indexVideoFile(videoPath: string): Promise<Video> {
		let video = await this.videoRepository.findOne({ where: { filePath: videoPath } });
		if (!video) {
			const fileStats = await this.filesystemService.getFileStats(videoPath);
			const videoMetadata = await this.ffmpegService.getFileMetadata(videoPath);
			video = this.videoRepository.create({
				filePath: videoPath,
				fileSize: fileStats.size
			});
			await this.videoRepository.save(video);
		}
		this.logger.log(`Indexed video file: ${videoPath}`);
		return video;
	}

	streamVideo(video: Video, range: { start: number; end: number }) {
		try {
			return this.filesystemService.readStream(video.filePath, range);
		} catch (error) {
			throw new VideoReadError(video.filePath, error);
		}
	}

	async getAllVideos(take: number, skip: number): Promise<Video[]> {
		return this.videoRepository.find({
			order: { id: "ASC" },
			take,
			skip
		});
	}

	async getVideo(videoId: number): Promise<Video | null> {
		return this.videoRepository.findOne({ where: { id: videoId } });
	}

	private test(): void {
		return;
	}
}
