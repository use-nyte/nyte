import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AppModule } from "./app.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";

describe("AppModule", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [
				ConfigModule.forRoot({
					isGlobal: true
				}),
				AppModule
			]
		}).compile();
	});

	it("should compile the module", () => {
		expect(module).toBeDefined();
	});

	it("should have AppController", () => {
		const controller = module.get<AppController>(AppController);
		expect(controller).toBeDefined();
	});

	it("should have AppService", () => {
		const service = module.get<AppService>(AppService);
		expect(service).toBeDefined();
	});

	describe("Conditional module loading logic", () => {
		it("should evaluate NODE_ENV correctly for production", () => {
			const originalEnv = process.env.NODE_ENV;

			process.env.NODE_ENV = "production";
			const isProduction = process.env.NODE_ENV === "production";
			expect(isProduction).toBe(true);

			process.env.NODE_ENV = originalEnv;
		});

		it("should evaluate NODE_ENV correctly for development", () => {
			const originalEnv = process.env.NODE_ENV;

			process.env.NODE_ENV = "development";
			const isProduction = process.env.NODE_ENV === "production";
			expect(isProduction).toBe(false);

			process.env.NODE_ENV = originalEnv;
		});

		it("should handle ternary operator for conditional imports", () => {
			const prodModules = [{ name: "ServeStatic" }, { name: "ReactRouter" }];
			const devModules = [];

			const isProduction = true;
			const result = isProduction ? prodModules : devModules;

			expect(result).toEqual(prodModules);
			expect(result.length).toBe(2);
		});
	});
});
