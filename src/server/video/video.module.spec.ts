import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { VideoModule } from "./video.module";
import { VideoService } from "./video.service";
import { VideoController } from "./video.controller";

describe("VideoModule", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					isGlobal: true
				}),
				VideoModule
			]
		}).compile();
	});

	it("should compile the module", () => {
		expect(module).toBeDefined();
	});

	it("should provide the VideoService", () => {
		const videoService = module.get(VideoService);
		expect(videoService).toBeDefined();
		expect(videoService).toBeInstanceOf(VideoService);
	});

	it("should provide the VideoController", () => {
		const videoController = module.get(VideoController);
		expect(videoController).toBeDefined();
		expect(videoController).toBeInstanceOf(VideoController);
	});
});
