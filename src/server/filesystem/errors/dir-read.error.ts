import { NyteError } from "../../common/errors/nyte.error";

export class DirReadError extends NyteError {
	constructor(path: string, originalError: Error) {
		super(`Failed to read directory at ${path}`, originalError);
	}
}
