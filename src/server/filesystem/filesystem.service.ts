import { Injectable } from "@nestjs/common";
import fs from "fs";
import * as fsPromises from "fs/promises";
import path from "path";
import { Permission, Permissions } from "./enums/permission.enum";
import { DirReadError } from "./errors/dir-read.error";
import { FileReadError } from "./errors/file-read.error";
import { ScanDirectoryOptions } from "./types/scan-directory-options.type";

@Injectable()
export class FilesystemService {
	async canAccess(path: string, permissions: Permissions = Permission.VISIBLE): Promise<boolean> {
		return fsPromises
			.access(path, permissions)
			.then(() => true)
			.catch(() => false);
	}

	canAccessSync(path: string, permissions: Permissions = Permission.VISIBLE): boolean {
		try {
			fs.accessSync(path, permissions);
			return true;
		} catch {
			return false;
		}
	}

	readStream(path: string, range?: { start: number; end: number }): fs.ReadStream {
		return fs.createReadStream(path, range);
	}

	async scanDirectory(path: string, options?: ScanDirectoryOptions): Promise<string[]> {
		// @ts-expect-error - TypeScript incorrectly infers union type for withFileTypes
		return fsPromises
			.readdir(path, {
				withFileTypes: true,
				recursive: options?.recursive ?? false
			})
			.then(
				function handleDirReadSuccess(dirents: fs.Dirent[]) {
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

	async *scanDirectoryGenerator(dirPath: string, options?: ScanDirectoryOptions): AsyncGenerator<string, void, void> {
		try {
			const dir = await fsPromises.opendir(dirPath);

			for await (const dirent of dir) {
				const fullPath = path.join(dirPath, dirent.name);

				if (dirent.isDirectory() && options?.recursive) {
					yield* this.scanDirectoryGenerator(fullPath, options);
				} else if (dirent.isFile()) {
					if (
						!options?.filterFileTypes ||
						options.filterFileTypes.some((type) => dirent.name.endsWith(type))
					) {
						yield fullPath;
					}
				}
			}
		} catch (error) {
			throw new DirReadError(dirPath, error);
		}
	}

	public async getFile(path: string): Promise<Buffer> {
		return fsPromises
			.readFile(path)
			.then(
				function handleFileReadSuccess(data: Buffer): Buffer {
					return data;
				}.bind(this)
			)
			.catch(
				function handleFileReadError(error: Error): never {
					throw new FileReadError(path, error);
				}.bind(this)
			);
	}

	public async getFileStats(path: string): Promise<fs.Stats> {
		return fsPromises
			.stat(path)
			.then(
				function handleFileStatSuccess(stats: fs.Stats): fs.Stats {
					return stats;
				}.bind(this)
			)
			.catch(
				function handleFileStatError(error: Error): never {
					throw new FileReadError(path, error);
				}.bind(this)
			);
	}
}
