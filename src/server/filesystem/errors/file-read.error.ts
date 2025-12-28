import { NyteError } from "../../common/errors/nyte.error";

export class FileReadError extends NyteError {
	constructor(path: string, originalError: Error) {
		super(`Failed to read file at ${path}`, originalError);
	}
}
