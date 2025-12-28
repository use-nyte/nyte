import { NyteError } from "../../common/errors/nyte.error";

export class ReactRouterModuleLoadError extends NyteError {
	constructor(path: string, originalError: Error) {
		super(`Failed to load React Router module at ${path}`, originalError);
	}
}
