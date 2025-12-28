import { NyteError } from "../../common/errors/nyte.error";

export class ReactRouterBuildError extends NyteError {
	constructor() {
		super(`React Router build was requested, but not ready`);
	}
}
