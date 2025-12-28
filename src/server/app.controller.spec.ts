import { Test, TestingModule } from "@nestjs/testing";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppController", () => {
	let controller: AppController;

	const mockService = {
		getHealth: jest.fn()
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [AppController],
			providers: [
				{
					provide: AppService,
					useValue: mockService
				}
			]
		}).compile();

		controller = module.get<AppController>(AppController);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	it("should construct with AppService", () => {
		const newController = new AppController(mockService as AppService);
		expect(newController).toBeDefined();
		expect(newController["appService"]).toBe(mockService);
	});

	describe("getHealth", () => {
		it("should return health status", () => {
			const mockHealth = {
				status: "ok",
				timestamp: "2025-12-28T00:00:00.000Z",
				version: "0.1.0"
			};

			mockService.getHealth.mockReturnValue(mockHealth);

			const result = controller.getHealth();

			expect(mockService.getHealth).toHaveBeenCalled();
			expect(result).toEqual(mockHealth);
		});

		it("should call service getHealth method", () => {
			mockService.getHealth.mockReturnValue({
				status: "ok",
				timestamp: expect.any(String),
				version: "0.1.0"
			});

			controller.getHealth();

			expect(mockService.getHealth).toHaveBeenCalledTimes(1);
		});
	});
});
