import { Injectable } from "@nestjs/common";
import fs from "fs/promises";

import { ScanDirectoryOptions } from "./types/scan-directory-options.type";
import { FileReadError } from "./errors/file-read.error";
import { DirReadError } from "./errors/dir-read.error";
import { Dirent } from "fs";

@Injectable()
export class FilesystemService {
	async scanDirectory(path: string, options?: ScanDirectoryOptions): Promise<string[]> {
		// @ts-expect-error - TypeScript incorrectly infers union type for withFileTypes
		return fs
			.readdir(path, {
				withFileTypes: true,
				recursive: options?.recursive ?? false
			})
			.then(
				function handleDirReadSuccess(dirents: Dirent[]) {
					let results = dirents.map((dirent) => dirent.name);
					if (options?.filterFileTypes) {
						results = results.filter((name) =>
							options.filterFileTypes?.some((type) => name.endsWith(type))
						);
					}
					return results;
				}.bind(this)
			)
			.catch(
				function handleDirReadError(error: Error) {
					throw new DirReadError(path, error);
				}.bind(this)
			);
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
