import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Response } from "express";
import { DirReadError } from "../../filesystem/errors/dir-read.error";
import { FileReadError } from "../../filesystem/errors/file-read.error";
import { VideoReadError } from "../../video/errors/video-read.error";
import { NyteError } from "../errors/nyte.error";

@Catch(NyteError)
export class NyteExceptionFilter implements ExceptionFilter {
	catch(exception: NyteError, host: ArgumentsHost) {
		const ctx = host.switchToHttp();
		const response = ctx.getResponse<Response>();

		const logger = new Logger(exception.constructor.name);
		logger.error(exception.stack);

		let status = HttpStatus.INTERNAL_SERVER_ERROR;

		if (exception instanceof FileReadError || exception instanceof VideoReadError) {
			status = HttpStatus.NOT_FOUND;
		} else if (exception instanceof DirReadError) {
			status = HttpStatus.BAD_REQUEST;
		}

		response.status(status).json({
			statusCode: status,
			message: exception.message.split("\n")[0],
			error: this.getErrorName(status),
			timestamp: new Date().toISOString()
		});
	}

	private getErrorName(status: number): string {
		switch (status) {
			case HttpStatus.NOT_FOUND:
				return "Not Found";
			case HttpStatus.BAD_REQUEST:
				return "Bad Request";
			default:
				return "Internal Server Error";
		}
	}
}
