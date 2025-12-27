import { Injectable, Logger } from "@nestjs/common";
import fs from "fs/promises";

import { ScanDirectoryOptions } from "./types/scan-directory-options.type";
import { FileReadError } from "./errors/file-read.error";

@Injectable()
export class FilesystemService {
	private readonly logger = new Logger(FilesystemService.name);

	async scanDirectory(path: string, options?: ScanDirectoryOptions): Promise<string[]> {
		const dirents = await fs.readdir(path, {
			withFileTypes: true,
			recursive: options?.recursive ?? false
		});
		let results = dirents.map((dirent) => dirent.name);
		if (options?.filterFileTypes) {
			results = results.filter((name) => options.filterFileTypes?.some((type) => name.endsWith(type)));
		}
		return results;
	}

	async getFile(path: string): Promise<Buffer> {
		return fs
			.readFile(path)
			.then(
				function handleFileReadSuccess(data: Buffer) {
					return data;
				}.bind(this)
			)
			.catch(
				function handleFileReadError(error: Error) {
					throw new FileReadError(path, error);
				}.bind(this)
			);
	}
}
