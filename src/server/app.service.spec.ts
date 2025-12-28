import { Test, TestingModule } from "@nestjs/testing";
import { AppService } from "./app.service";

describe("AppService", () => {
	let service: AppService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [AppService]
		}).compile();

		service = module.get<AppService>(AppService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("getHealth", () => {
		it("should return health status with ok status", () => {
			const result = service.getHealth();

			expect(result).toHaveProperty("status", "ok");
		});

		it("should return health status with timestamp", () => {
			const result = service.getHealth();

			expect(result).toHaveProperty("timestamp");
			expect(typeof result.timestamp).toBe("string");
			expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
		});

		it("should return health status with version", () => {
			const result = service.getHealth();

			expect(result).toHaveProperty("version", "0.1.0");
		});

		it("should return health status with all required fields", () => {
			const result = service.getHealth();

			expect(result).toEqual({
				status: "ok",
				timestamp: expect.any(String),
				version: "0.1.0"
			});
		});

		it("should return ISO timestamp format", () => {
			const beforeCall = new Date();
			const result = service.getHealth();
			const afterCall = new Date();

			const timestamp = new Date(result.timestamp);

			expect(timestamp.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
			expect(timestamp.getTime()).toBeLessThanOrEqual(afterCall.getTime());
		});
	});
});
