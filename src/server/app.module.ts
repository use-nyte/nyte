import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ReactRouterModule } from "./react-router/react-router.module";
import configuration from "./config/configuration";

const isProduction = process.env.NODE_ENV === "production";

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration]
		}),
		...(isProduction
			? [
					ServeStaticModule.forRoot({
						rootPath: join(__dirname, "..", "web", "client"),
						serveRoot: "/"
					}),
					ReactRouterModule
				]
			: [])
	],
	controllers: [AppController],
	providers: [AppService]
})
export class AppModule {}
