import { Test, TestingModule } from "@nestjs/testing";
import { FilesystemService } from "./filesystem.service";
import { DirReadError } from "./errors/dir-read.error";
import { FileReadError } from "./errors/file-read.error";

const TESTING_DIRECTORY = "./test/mock_directory";

describe("FilesystemService", () => {
	let service: FilesystemService;

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			providers: [FilesystemService]
		}).compile();

		service = module.get<FilesystemService>(FilesystemService);
	});

	it("should be defined", () => {
		expect(service).toBeDefined();
	});

	describe("scanDirectory", () => {
		it("should list all files in the directory", async () => {
			const files = await service.scanDirectory(TESTING_DIRECTORY);
			expect(files).toEqual(
				expect.arrayContaining(["testfile1.txt", "testfile2.txt", "testfile3.txt", "video.mp4"])
			);
		});

		it("should scan directories recursively", async () => {
			const files = await service.scanDirectory(TESTING_DIRECTORY, {
				recursive: true
			});
			expect(files).toEqual(
				expect.arrayContaining([
					"testfile1.txt",
					"testfile2.txt",
					"testfile3.txt",
					"video.mp4",
					"testfile4.txt"
				])
			);
		});

		it("should filter files by type", async () => {
			const files = await service.scanDirectory(TESTING_DIRECTORY, {
				filterFileTypes: [".mp4"]
			});
			expect(files).toEqual(["video.mp4"]);
		});

		it("should filter files by type recursively", async () => {
			const files = await service.scanDirectory(TESTING_DIRECTORY, {
				recursive: true,
				filterFileTypes: [".txt"]
			});
			expect(files).toEqual(
				expect.arrayContaining(["testfile1.txt", "testfile2.txt", "testfile3.txt", "testfile4.txt"])
			);
		});

		it("should throw DirReadError for non-existent directory", async () => {
			await expect(service.scanDirectory(`${TESTING_DIRECTORY}/non_existent_directory`)).rejects.toThrow(
				DirReadError
			);
		});
	});

	describe("getFile", () => {
		it("should read a file and return its content as Buffer", async () => {
			const filePath = `${TESTING_DIRECTORY}/testfile1.txt`;
			const fileBuffer = await service.getFile(filePath);
			expect(fileBuffer).toBeInstanceOf(Buffer);
			expect(fileBuffer.toString()).toBe("This is test file 1.");
		});

		it("should throw FileReadError for non-existent file", async () => {
			const nonExistentFilePath = `${TESTING_DIRECTORY}/non_existent_file.txt`;
			await expect(service.getFile(nonExistentFilePath)).rejects.toThrow(FileReadError);
		});
	});
});
