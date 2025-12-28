import { Test, TestingModule } from "@nestjs/testing";
import { FilesystemModule } from "./filesystem.module";
import { FilesystemService } from "./filesystem.service";

describe("FilesystemModule", () => {
	let module: TestingModule;

	beforeAll(async () => {
		module = await Test.createTestingModule({
			imports: [FilesystemModule]
		}).compile();
	});

	it("should compile the module", () => {
		expect(module).toBeDefined();
	});

	it("should provide the FilesystemService", () => {
		const filesystemService = module.get(FilesystemService);
		expect(filesystemService).toBeDefined();
		expect(filesystemService).toBeInstanceOf(FilesystemService);
	});
});
