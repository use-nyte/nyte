import { Test, TestingModule } from "@nestjs/testing";
import { ReactRouterController } from "./react-router.controller";
import { ReactRouterModule } from "./react-router.module";
import { ReactRouterService } from "./react-router.service";

describe("ReactRouterModule", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [ReactRouterModule]
		}).compile();
	});

	it("should compile the module", () => {
		expect(module).toBeDefined();
	});

	it("should provide the ReactRouterService", () => {
		const reactRouterService = module.get(ReactRouterService);
		expect(reactRouterService).toBeDefined();
		expect(reactRouterService).toBeInstanceOf(ReactRouterService);
	});

	it("should provide the ReactRouterController", () => {
		const reactRouterController = module.get(ReactRouterController);
		expect(reactRouterController).toBeDefined();
		expect(reactRouterController).toBeInstanceOf(ReactRouterController);
	});
});
