import { Injectable, Logger } from "@nestjs/common";
import { FilesystemService } from "../filesystem/filesystem.service";
import { ConfigService } from "@nestjs/config";
import { VideoReadError } from "./errors/video-read.error";
import { InjectRepository } from "@nestjs/typeorm";
import { Video } from "./entities/video.entity";
import { Repository } from "typeorm";

@Injectable()
export class VideoService {
	private readonly logger = new Logger(VideoService.name, { timestamp: true });

	constructor(
		private readonly configService: ConfigService,
		private readonly filesystemService: FilesystemService,
		@InjectRepository(Video)
		private readonly videoRepository: Repository<Video>
	) {}

	async indexVideoFile(videoPath: string): Promise<Video> {
		let video = await this.videoRepository.findOne({ where: { filePath: videoPath } });
		if (!video) {
			video = this.videoRepository.create({
				filePath: videoPath,
				fileSize: (await this.filesystemService.getFileStats(videoPath)).size
			});
		}
		await this.videoRepository.save(video);
		this.logger.log(`Indexed video file: ${videoPath}`);
		return video;
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

	streamVideo(video: Video, range: { start: number; end: number }) {
		try {
			return this.filesystemService.readStream(video.filePath, range);
		} catch (error) {
			throw new VideoReadError(video.filePath, error);
		}
	}
}
