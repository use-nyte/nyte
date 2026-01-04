import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import configuration from "./config/configuration";
import { FfmpegModule } from "./ffmpeg/ffmpeg.module";
import { MediaModule } from "./media/media.module";
import { ReactRouterModule } from "./react-router/react-router.module";
import { VideoModule } from "./video/video.module";

const isProduction = process.env.NODE_ENV === "production";

@Module({
	providers: [AppService],
	controllers: [AppController],
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			load: [configuration]
		}),
		TypeOrmModule.forRoot({
			type: "better-sqlite3",
			database: join(process.cwd(), "data", "nyte.sqlite"),
			entities: [join(__dirname, "**", "*.entity.{ts,js}")],
			synchronize: true
		}),
		FfmpegModule,
		MediaModule,
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
