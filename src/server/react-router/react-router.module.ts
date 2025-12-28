import { Module } from "@nestjs/common";
import { ReactRouterController } from "./react-router.controller";
import { ReactRouterService } from "./react-router.service";

@Module({
	providers: [ReactRouterService],
	controllers: [ReactRouterController],
	exports: [ReactRouterService]
})
export class ReactRouterModule {}
