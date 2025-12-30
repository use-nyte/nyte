import { Injectable } from "@nestjs/common";
import path from "path";
import fs from "fs";

@Injectable()
export class FfmpegPathService {
	private getArchitecture(): "x64" | "arm64" {
		return process.arch === "arm64" ? "arm64" : "x64";
	}

	private getBinariesDir(): string {
		const platform = process.platform;
		const arch = this.getArchitecture();

		// Map platform and arch to binary directory
		let platformDir: string;
		if (platform === "win32") {
			platformDir = arch === "arm64" ? "win32-arm64" : "win32-x64";
		} else if (platform === "linux") {
			platformDir = arch === "arm64" ? "linux-arm64" : "linux-x64";
		} else {
			throw new Error(`Unsupported platform: ${platform}`);
		}

		return path.join(process.cwd(), "bin", "ffmpeg", platformDir);
	}

	/**
	 * Get the full path to the ffmpeg executable
	 */
	getFfmpegPath(): string {
		const binariesDir = this.getBinariesDir();
		const ext = process.platform === "win32" ? ".exe" : "";
		const ffmpegPath = path.join(binariesDir, `ffmpeg${ext}`);

		if (!fs.existsSync(ffmpegPath)) {
			throw new Error(
				`FFmpeg binary not found at ${ffmpegPath}. ` +
					`Please run 'pnpm download-ffmpeg' to download the binaries.`
			);
		}

		return ffmpegPath;
	}

	/**
	 * Get the full path to the ffprobe executable
	 */
	getFfprobePath(): string {
		const binariesDir = this.getBinariesDir();
		const ext = process.platform === "win32" ? ".exe" : "";
		const ffprobePath = path.join(binariesDir, `ffprobe${ext}`);

		if (!fs.existsSync(ffprobePath)) {
			throw new Error(
				`FFprobe binary not found at ${ffprobePath}. ` +
					`Please run 'pnpm download-ffmpeg' to download the binaries.`
			);
		}

		return ffprobePath;
	}
}
