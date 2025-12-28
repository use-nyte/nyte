import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ReactRouterModule } from "./react-router/react-router.module";
import { VideoModule } from "./video/video.module";
import configuration from "./config/configuration";

const isProduction = process.env.NODE_ENV === "production";

@Module({
	providers: [AppService],
	controllers: [AppController],
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration]
		}),
		VideoModule,
		...(isProduction
			? [
					ServeStaticModule.forRoot({
						rootPath: join(process.cwd(), "dist", "web", "client"),
						serveRoot: "/"
					}),
					ReactRouterModule
				]
			: [])
	]
})
export class AppModule {}
