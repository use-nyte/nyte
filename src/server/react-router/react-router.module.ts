import { Module } from "@nestjs/common";
import { ReactRouterController } from "./react-router.controller";
import { ReactRouterService } from "./react-router.service";

@Module({
	controllers: [ReactRouterController],
	providers: [ReactRouterService],
	exports: [ReactRouterService]
})
export class ReactRouterModule {}
