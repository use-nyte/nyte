import { Test, TestingModule } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { ReactRouterController } from "./react-router.controller";
import { ReactRouterService } from "./react-router.service";
import type { Request, Response, NextFunction } from "express";
import { NyteExceptionFilter } from "../common/filters/nyte-exception.filter";
import { ReactRouterBuildError } from "./errors/react-router-build.error";
import { ReactRouterRenderError } from "./errors/react-router-render.error";

describe("ReactRouterController", () => {
	let controller: ReactRouterController;

	const mockReq = (overrides: Partial<Request> = {}): Partial<Request> => ({
		url: "/",
		path: "/",
		method: "GET",
		headers: { host: "localhost" },
		params: {},
		...overrides
	});

	const mockRes = (): Partial<Response> => {
		const res: Partial<Response> = {
			status: jest.fn().mockReturnThis(),
			send: jest.fn().mockReturnThis(),
			json: jest.fn().mockReturnThis(),
			setHeader: jest.fn().mockReturnThis(),
			write: jest.fn().mockReturnThis(),
			end: jest.fn().mockReturnThis()
		};
		return res;
	};

	const mockNext: NextFunction = jest.fn();

	const mockService = {
		isBuildReady: jest.fn(),
		getHandler: jest.fn()
	};

	beforeEach(async () => {
		const module: TestingModule = await Test.createTestingModule({
			controllers: [ReactRouterController],
			providers: [
				{
					provide: ReactRouterService,
					useValue: mockService
				},
				{
					provide: APP_FILTER,
					useClass: NyteExceptionFilter
				}
			]
		}).compile();

		controller = module.get<ReactRouterController>(ReactRouterController);

		jest.clearAllMocks();
	});

	it("should be defined", () => {
		expect(controller).toBeDefined();
	});

	describe("render", () => {
		it("should call next() for API routes", async () => {
			const req = mockReq({ path: "/api/health" });
			const res = mockRes();

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
			expect(mockService.isBuildReady).not.toHaveBeenCalled();
		});

		it("should call next() for assets", async () => {
			const req = mockReq({ path: "/assets/favicon.ico" });
			const res = mockRes();

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockNext).toHaveBeenCalled();
		});

		it("should use localhost as default when host header is missing", async () => {
			const req = mockReq({
				path: "/",
				headers: {}
			});
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: null
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockHandler).toHaveBeenCalled();
			const webRequest = mockHandler.mock.calls[0][0];
			expect(webRequest.url).toContain("localhost");
		});

		it("should throw ReactRouterBuildError when build is not ready", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();
			mockService.isBuildReady.mockReturnValue(false);

			await expect(controller.render(req as Request, res as Response, mockNext)).rejects.toThrow(
				ReactRouterBuildError
			);
		});

		it("should render successfully when build is ready with no body", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: null
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockService.getHandler).toHaveBeenCalled();
			expect(mockHandler).toHaveBeenCalled();
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.setHeader).toHaveBeenCalledWith("content-type", "text/html");
			expect(res.end).toHaveBeenCalled();
		});

		it("should stream response body using pump when body exists", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const chunk1 = new Uint8Array([1, 2, 3]);
			const chunk2 = new Uint8Array([4, 5, 6]);

			const mockReader = {
				read: jest
					.fn()
					.mockResolvedValueOnce({ done: false, value: chunk1 })
					.mockResolvedValueOnce({ done: false, value: chunk2 })
					.mockResolvedValueOnce({ done: true, value: undefined })
			};

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: {
					getReader: jest.fn().mockReturnValue(mockReader)
				}
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockReader.read).toHaveBeenCalledTimes(3);
			expect(res.write).toHaveBeenCalledWith(chunk1);
			expect(res.write).toHaveBeenCalledWith(chunk2);
			expect(res.write).toHaveBeenCalledTimes(2);
			expect(res.end).toHaveBeenCalledTimes(1);
		});

		it("should handle single chunk stream in pump", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const chunk = new Uint8Array([7, 8, 9]);

			const mockReader = {
				read: jest
					.fn()
					.mockResolvedValueOnce({ done: false, value: chunk })
					.mockResolvedValueOnce({ done: true, value: undefined })
			};

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: {
					getReader: jest.fn().mockReturnValue(mockReader)
				}
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockReader.read).toHaveBeenCalledTimes(2);
			expect(res.write).toHaveBeenCalledWith(chunk);
			expect(res.write).toHaveBeenCalledTimes(1);
			expect(res.end).toHaveBeenCalledTimes(1);
		});

		it("should handle empty stream in pump", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const mockReader = {
				read: jest.fn().mockResolvedValueOnce({ done: true, value: undefined })
			};

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: {
					getReader: jest.fn().mockReturnValue(mockReader)
				}
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockReader.read).toHaveBeenCalledTimes(1);
			expect(res.write).not.toHaveBeenCalled();
			expect(res.end).toHaveBeenCalledTimes(1);
		});

		it("should handle POST request with body", async () => {
			const req = mockReq({
				path: "/",
				method: "POST",
				body: { key: "value" }
			});
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: null
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockHandler).toHaveBeenCalled();
			const webRequest = mockHandler.mock.calls[0][0];
			expect(webRequest).toBeInstanceOf(Request);
		});

		it("should handle HEAD request without body", async () => {
			const req = mockReq({
				path: "/",
				method: "HEAD"
			});
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);

			const mockHandler = jest.fn().mockResolvedValue({
				status: 200,
				headers: new Map([["content-type", "text/html"]]),
				body: null
			});
			mockService.getHandler.mockReturnValue(mockHandler);

			await controller.render(req as Request, res as Response, mockNext);

			expect(mockHandler).toHaveBeenCalled();
			const webRequest = mockHandler.mock.calls[0][0];
			expect(webRequest).toBeInstanceOf(Request);
		});

		it("should throw ReactRouterRenderError on rendering error", async () => {
			const req = mockReq({ path: "/" });
			const res = mockRes();

			mockService.isBuildReady.mockReturnValue(true);
			mockService.getHandler.mockImplementation(() => {
				throw new Error("Rendering failed");
			});

			await expect(controller.render(req as Request, res as Response, mockNext)).rejects.toThrow(
				ReactRouterRenderError
			);
		});
	});
});
