import { NyteError } from "../../common/errors/nyte.error";

export class ReactRouterRenderError extends NyteError {
	constructor(originalError: Error) {
		super(`React Router rendering failed`, originalError);
	}
}
