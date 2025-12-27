import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ReactRouterModule } from "./react-router/react-router.module";
import { MediaModule } from "./media/media.module";
import { FilesystemService } from "./filesystem/filesystem.service";
import { FilesystemModule } from "./filesystem/filesystem.module";
import configuration from "./config/configuration";

const isProduction = process.env.NODE_ENV === "production";

@Module({
	providers: [AppService, FilesystemService],
	controllers: [AppController],
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration]
		}),
		MediaModule,
		FilesystemModule,
		...(isProduction
			? [
					ServeStaticModule.forRoot({
						rootPath: join(__dirname, "..", "web", "client"),
						serveRoot: "/"
					}),
					ReactRouterModule
				]
			: [])
	]
})
export class AppModule {}
