import { NyteError } from "../../common/errors/nyte.error";

export class FfmpegPlatformError extends NyteError {
	constructor(platform: string) {
		super(`Unsupported platform: ${platform}`);
	}
}
