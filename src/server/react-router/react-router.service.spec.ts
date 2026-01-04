import { Test, TestingModule } from "@nestjs/testing";
import fs from "fs";
import { join } from "path";
import { pathToFileURL } from "url";
import { ReactRouterBuildError } from "./errors/react-router-build.error";
import { ReactRouterModuleLoadError } from "./errors/react-router-module-load.error";
import { ReactRouterService } from "./react-router.service";

const distExists = fs.existsSync(join(process.cwd(), "dist"));

(distExists ? describe : describe.skip)("ReactRouterService", () => {
	let service: ReactRouterService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [ReactRouterService]
		}).compile();

		service = module.get<ReactRouterService>(ReactRouterService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("onModuleInit", () => {
		it("should load the server build", async () => {
			await service.onModuleInit();
			expect(service.isBuildReady()).toBe(true);
		});
	});

	describe("loadBuild", () => {
		it("should load the server build without errors", async () => {
			await expect(service["loadBuild"]()).resolves.toBeUndefined();
			expect(service.isBuildReady()).toBe(true);
		});

		it("should throw an error if the build file does not exist", async () => {
			const originalCwd = process.cwd;
			process.cwd = () => pathToFileURL(join(__dirname, "non_existent_directory")).href;
			await expect(service["loadBuild"]()).rejects.toThrow(ReactRouterModuleLoadError);
			process.cwd = originalCwd;
		});
	});

	describe("isBuildReady", () => {
		it("should return true if build is loaded", async () => {
			await service.onModuleInit();
			expect(service.isBuildReady()).toBe(true);
		});

		it("should return false if build is not loaded", () => {
			expect(service.isBuildReady()).toBe(false);
		});
	});

	describe("getHandler", () => {
		it("should return the handler if build is loaded", async () => {
			await service.onModuleInit();
			const handler = service.getHandler();
			expect(handler).toBeDefined();
			expect(typeof handler).toBe("function");
		});

		it("should throw an error if build is not loaded", () => {
			expect(() => service.getHandler()).toThrow(ReactRouterBuildError);
		});
	});
});
