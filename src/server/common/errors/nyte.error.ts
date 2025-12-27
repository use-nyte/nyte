export class NyteError extends Error {
	private readonly originalError: Error;

	constructor(message: string, originalError: Error) {
		super(`${message}\n${NyteError.getRootMessage(originalError)}`);

		Object.defineProperty(this, "originalError", {
			value: originalError,
			enumerable: false,
			writable: false,
			configurable: false
		});

		if (this.stack && originalError.stack) {
			const messageLines = this.stack.split("\n").filter((line) => !line.trim().startsWith("at "));
			const thisAtLine = this.stack.split("\n").find((line) => line.trim().startsWith("at "));
			const errorAtLines = originalError.stack.split("\n").filter((line) => line.trim().startsWith("at "));

			this.stack = [...messageLines, thisAtLine, ...errorAtLines].filter(Boolean).join("\n");
		}
	}

	private static getRootMessage(error: Error): string {
		if (error instanceof NyteError && error.originalError) {
			return NyteError.getRootMessage(error.originalError);
		}
		return error.message;
	}
}
