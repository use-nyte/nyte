import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { VideoService } from "./video.service";
import { FilesystemService } from "../filesystem/filesystem.service";

const TESTING_DIRECTORY = "./test/mock_directory";

describe("VideoService", () => {
	let service: VideoService;

	const mockConfigService = {
		get: jest.fn()
	};

	const mockFilesystemService = {
		scanDirectory: jest.fn(),
		getFile: jest.fn()
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [
				VideoService,
				{
					provide: ConfigService,
					useValue: mockConfigService
				},
				{
					provide: FilesystemService,
					useValue: mockFilesystemService
				}
			]
		}).compile();

		service = module.get<VideoService>(VideoService);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("scanVideosInDirectory", () => {
		it("should list all video files in the directory", async () => {
			mockFilesystemService.scanDirectory.mockResolvedValue(["video.mp4"]);

			const videos = await service.scanVideosInDirectory(TESTING_DIRECTORY);

			expect(mockFilesystemService.scanDirectory).toHaveBeenCalledWith(TESTING_DIRECTORY, {
				recursive: true,
				filterFileTypes: [".mp4", ".mkv", ".avi", ".mov"]
			});
			expect(videos).toEqual(["video.mp4"]);
		});

		it("should call filesystemService with correct options", async () => {
			mockFilesystemService.scanDirectory.mockResolvedValue(["video.mp4", "movie.avi"]);

			const videos = await service.scanVideosInDirectory(TESTING_DIRECTORY);

			expect(mockFilesystemService.scanDirectory).toHaveBeenCalled();
			expect(videos).toEqual(["video.mp4", "movie.avi"]);
		});
	});

	describe("getVideo", () => {
		it("should return video buffer when file exists", async () => {
			const mockBuffer = Buffer.from("video data");
			mockFilesystemService.getFile.mockResolvedValue(mockBuffer);

			const result = await service.getVideo("/path/to/video.mp4");

			expect(mockFilesystemService.getFile).toHaveBeenCalledWith("/path/to/video.mp4");
			expect(result).toBe(mockBuffer);
		});

		it("should throw VideoReadError when file read fails", async () => {
			const error = new Error("File not found");
			mockFilesystemService.getFile.mockRejectedValue(error);

			await expect(service.getVideo("/path/to/nonexistent.mp4")).rejects.toThrow(
				"Failed to read video file at /path/to/nonexistent.mp4"
			);
		});
	});
});
