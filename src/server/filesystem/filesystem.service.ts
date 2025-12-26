import { Injectable } from "@nestjs/common";
import fs from "fs/promises";

import { ScanDirectoryOptions } from "./types/scan-directory-options.type";

@Injectable()
export class FilesystemService {

	async scanDirectory(path: string, options?: ScanDirectoryOptions): Promise<string[]> {
		const dirents = await fs
            .readdir(path, {
                withFileTypes: true,
                recursive: options?.recursive ?? false
            });
        let results = dirents.map((dirent) => dirent.name);
        if (options?.filterFileTypes) {
            results = results.filter((name) => options.filterFileTypes?.some((type) => name.endsWith(type))
            );
        }
        return results;
	}

}
