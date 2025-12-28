import { NyteError } from "../../common/errors/nyte.error";

export class VideoReadError extends NyteError {
	constructor(path: string, originalError: Error) {
		super(`Failed to read video file at ${path}`, originalError);
	}
}
