/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { spawn, ChildProcess } from "child_process";
import { FfmpegPathService } from "./ffmpeg-path.service";

@Injectable()
export class FfmpegService implements OnApplicationBootstrap {
	private readonly logger = new Logger(FfmpegService.name, { timestamp: true });

	private supportedFormatsCache: Array<{
		name: string;
		description: string;
		canDemux: boolean;
		canMux: boolean;
	}> | null = null;

	constructor(private readonly ffmpegPathService: FfmpegPathService) {}

	async onApplicationBootstrap(): Promise<void> {
		this.logger.log("Finding supported formats using ffmpeg...");
		this.supportedFormatsCache = await this.getSupportedFormats();
		this.logger.log(`Found ${this.supportedFormatsCache.length} supported formats.`);
	}

	private spawnFfmpeg(args: string[]): ChildProcess {
		const ffmpegPath = this.ffmpegPathService.getFfmpegPath();
		return spawn(ffmpegPath, args);
	}

	private spawnFfprobe(args: string[]): ChildProcess {
		const ffprobePath = this.ffmpegPathService.getFfprobePath();
		return spawn(ffprobePath, args);
	}

	public getFileMetadata(filePath: string): Promise<any | null> {
		return new Promise((resolve) => {
			const args = [
				"-v",
				"error",
				"-show_format",
				"-show_streams",
				"-show_chapters",
				"-print_format",
				"json",
				filePath
			];
			const ffprobeProcess = this.spawnFfprobe(args);
			let output = "";
			let errorOutput = "";
			ffprobeProcess.stdout?.on("data", (data) => {
				output += data;
			});
			ffprobeProcess.stderr?.on("data", (data) => {
				errorOutput += data;
			});
			ffprobeProcess.on("close", (code) => {
				if (code === 0) {
					try {
						const metadata = JSON.parse(output);
						resolve(metadata);
					} catch (error) {
						// Failed to parse output, not a valid media file
						resolve(null);
					}
				} else {
					// ffprobe failed (likely not a media file)
					resolve(null);
				}
			});
		});
	}

	public getSupportedFormats(): Promise<
		Array<{ name: string; description: string; canDemux: boolean; canMux: boolean }>
	> {
		return new Promise((resolve) => {
			const args = ["-formats"];
			const ffmpegProcess = this.spawnFfmpeg(args);
			let output = "";

			ffmpegProcess.stdout?.on("data", (data) => {
				output += data;
			});

			ffmpegProcess.stderr?.on("data", (data) => {
				output += data;
			});

			ffmpegProcess.on("close", () => {
				const formats: Array<{ name: string; description: string; canDemux: boolean; canMux: boolean }> = [];
				const lines = output.split("\n");
				let parsingFormats = false;

				for (let line of lines) {
					// Remove carriage return for Windows line endings
					line = line.replace(/\r$/, "");

					// Start parsing after the header line with dashes
					if (!parsingFormats && line.match(/^\s*--/)) {
						parsingFormats = true;
						continue;
					}

					if (parsingFormats && line.trim()) {
						// Format lines look like: " DE  mp4             MP4 (MPEG-4 Part 14)"
						// Position 1: D or space, Position 2: space, Position 3: E or space
						const match = line.match(/^\s([D\s])\s([E\s])\s+(\S+)\s+(.*)$/);
						if (match) {
							formats.push({
								name: match[3].trim(),
								description: match[4].trim() || match[3].trim(),
								canDemux: match[1] === "D",
								canMux: match[2] === "E"
							});
						}
					}
				}

				resolve(formats);
			});
		});
	}

	private getImageFormatName(ext: string): string {
		if (!this.supportedFormatsCache) return ext;

		// First, check if the extension exists as-is
		const hasExactMatch = this.supportedFormatsCache.some((f) =>
			f.name
				.split(",")
				.map((n) => n.trim())
				.includes(ext)
		);
		if (hasExactMatch) return ext;

		// Check if there's a pipe format for this extension
		const pipeFormat = `${ext}_pipe`;
		const hasPipeFormat = this.supportedFormatsCache.some((f) => f.name === pipeFormat);
		if (hasPipeFormat) return pipeFormat;

		// Check if image2 format exists (universal image handler)
		const hasImage2 = this.supportedFormatsCache.some((f) => f.name === "image2");
		if (hasImage2) {
			return "image2";
		}

		return ext;
	}

	public isFormatSupported(fileExtension: string, checkDemux: boolean = true, checkMux: boolean = false): boolean {
		if (!this.supportedFormatsCache) {
			this.logger.warn("Supported formats cache is not initialized. Was the application bootstrap completed?");
			return false;
		}

		const EXTENSION_MAP = {
			jpg: "jpeg",
			mkv: "matroska"
		};

		let ext = fileExtension.toLowerCase().replace(/^\./, ""); // Remove leading dot if present
		if (EXTENSION_MAP[ext]) {
			ext = EXTENSION_MAP[ext];
		}

		// Dynamically map to the correct format name
		ext = this.getImageFormatName(ext);

		return this.supportedFormatsCache.some((format) => {
			// Split comma-separated format names (e.g., "mov,mp4,m4a,3gp,3g2,mj2")
			const formatNames = format.name.split(",").map((n) => n.trim());
			const hasExtension = formatNames.includes(ext);

			if (!hasExtension) return false;

			// Check if format supports the requested operation
			if (checkDemux && !format.canDemux) return false;
			if (checkMux && !format.canMux) return false;

			return true;
		});
	}

	public isVideoFile(metadata: any): boolean {
		if (!metadata || !metadata.format || !metadata.streams) return false;
		return (
			metadata.streams.some((s: any) => s.codec_type === "video" && s.codec_name !== "gif") &&
			metadata.format.bit_rate > 0 &&
			metadata.format.format_name !== "image2"
		);
	}

	public isAudioFile(metadata: any): boolean {
		if (!metadata || !metadata.format || !metadata.streams) return false;
		return metadata.streams.some((s: any) => s.codec_type === "audio") && metadata.format.bit_rate > 0;
	}

	public isImageFile(metadata: any): boolean {
		if (!metadata || !metadata.format || !metadata.streams) return false;
		return (
			metadata.streams.some((s: any) => s.codec_type === "video") &&
			(metadata.format.format_name === "image2" ||
				metadata.format.bit_rate === undefined ||
				metadata.format.bit_rate === 0)
		);
	}

	public isGifFile(metadata: any): boolean {
		if (!metadata || !metadata.format || !metadata.streams) return false;
		return (
			metadata.streams.some((s: any) => s.codec_type === "video" && s.codec_name === "gif") &&
			metadata.format.format_name === "gif"
		);
	}
}
