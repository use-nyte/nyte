import { Test, TestingModule } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { VideoController } from "./video.controller";
import { VideoService } from "./video.service";
import type { Request, Response } from "express";
import { NyteExceptionFilter } from "../common/filters/nyte-exception.filter";
import { VideoReadError } from "./errors/video-read.error";

describe("VideoController", () => {
	let controller: VideoController;

	const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
		params: {},
		...overrides
	});

	const mockRes = (): Partial<Response> => {
		const res: Partial<Response> = {
			json: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			setHeader: jest.fn().mockReturnThis()
		};
		return res;
	};

	const mockConfigService = {
		get: jest.fn()
	};

	const mockService = {
		scanVideosInDirectory: jest.fn(),
		getVideo: jest.fn(),
		configService: mockConfigService
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [VideoController],
			providers: [
				{
					provide: VideoService,
					useValue: mockService
				},
				{
					provide: APP_FILTER,
					useClass: NyteExceptionFilter
				}
			]
		}).compile();

		controller = module.get<VideoController>(VideoController);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	it("should construct with VideoService", () => {
		const newController = new VideoController(mockService as VideoService);
		expect(newController).toBeDefined();
		expect(newController["videoService"]).toBe(mockService);
	});

	describe("getVideos", () => {
		it("should return list of videos from configured directory", async () => {
			const req = mockReq();
			const res = mockRes();
			const mockVideos = ["video1.mp4", "video2.mkv", "video3.avi"];

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.scanVideosInDirectory.mockResolvedValue(mockVideos);

			await controller.getVideos(req as Request, res as Response);

			expect(mockConfigService.get).toHaveBeenCalledWith("filesystem.mediaDirectory");
			expect(mockService.scanVideosInDirectory).toHaveBeenCalledWith("/home/user/videos");
			expect(res.json).toHaveBeenCalledWith(mockVideos);
		});

		it("should use default path when config is not set", async () => {
			const req = mockReq();
			const res = mockRes();
			const mockVideos = ["video1.mp4"];

			mockConfigService.get.mockReturnValue(undefined);
			mockService.scanVideosInDirectory.mockResolvedValue(mockVideos);

			await controller.getVideos(req as Request, res as Response);

			expect(mockService.scanVideosInDirectory).toHaveBeenCalledWith("/path/to/media");
			expect(res.json).toHaveBeenCalledWith(mockVideos);
		});

		it("should return empty array when no videos found", async () => {
			const req = mockReq();
			const res = mockRes();

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.scanVideosInDirectory.mockResolvedValue([]);

			await controller.getVideos(req as Request, res as Response);

			expect(res.json).toHaveBeenCalledWith([]);
		});
	});

	describe("getVideo", () => {
		it("should return video buffer with correct content type for mp4", async () => {
			const req = mockReq({ params: { videoId: "movie.mp4" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("video data");

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(mockService.getVideo).toHaveBeenCalled();
			expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "video/mp4");
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});

		it("should return image with correct content type for png", async () => {
			const req = mockReq({ params: { videoId: "thumbnail.png" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("image data");

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/png");
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});

		it("should use default path when config is not set", async () => {
			const req = mockReq({ params: { videoId: "movie.mp4" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("video data");

			mockConfigService.get.mockReturnValue(undefined);
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(mockService.getVideo).toHaveBeenCalledWith(expect.stringContaining("movie.mp4"));
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});

		it("should handle video in subdirectory", async () => {
			const req = mockReq({ params: { videoId: "subfolder/movie.mp4" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("video data");

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(mockService.getVideo).toHaveBeenCalled();
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});

		it("should throw VideoReadError when video does not exist", async () => {
			const req = mockReq({ params: { videoId: "nonexistent.mp4" } });
			const res = mockRes();

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockRejectedValue(
				new VideoReadError("/home/user/videos/nonexistent.mp4", new Error("File not found"))
			);

			await expect(controller.getVideo(req as Request, res as Response)).rejects.toThrow(VideoReadError);
		});

		it("should handle mkv files with video/mp4 content type", async () => {
			const req = mockReq({ params: { videoId: "movie.mkv" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("video data");

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "video/mp4");
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});

		it("should handle avi files with video/mp4 content type", async () => {
			const req = mockReq({ params: { videoId: "movie.avi" } });
			const res = mockRes();
			const mockBuffer = Buffer.from("video data");

			mockConfigService.get.mockReturnValue("/home/user/videos");
			mockService.getVideo.mockResolvedValue(mockBuffer);

			await controller.getVideo(req as Request, res as Response);

			expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "video/mp4");
			expect(res.send).toHaveBeenCalledWith(mockBuffer);
		});
	});
});
