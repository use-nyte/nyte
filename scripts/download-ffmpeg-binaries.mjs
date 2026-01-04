#!/usr/bin/env node

import { exec } from "child_process";
import crypto from "crypto";
import fs, { createWriteStream } from "fs";
import https from "https";
import path from "path";
import { pipeline } from "stream";
import { fileURLToPath } from "url";
import { promisify } from "util";
import yauzl from "yauzl";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const streamPipeline = promisify(pipeline);
const execAsync = promisify(exec);

// Allow tag override via env or CLI
const TAG = process.env.FFMPEG_TAG || process.argv[2] || "latest";
const RELEASE = process.env.FFMPEG_RELEASE || process.argv[3] || "master-latest";
let MAJOR_MINOR_VERSION = RELEASE;
if (MAJOR_MINOR_VERSION && MAJOR_MINOR_VERSION.match(/n\d+\.\d+\.\d+.*/)) {
	MAJOR_MINOR_VERSION = MAJOR_MINOR_VERSION.split(".").slice(0, 2).join(".").replace("n", "-");
} else {
	MAJOR_MINOR_VERSION = "";
}

const PLATFORMS = [
	{
		name: "Windows x64",
		platform: "win32",
		arch: "x64",
		url: `https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/ffmpeg-${RELEASE}-win64-gpl${MAJOR_MINOR_VERSION}.zip`,
		fileName: `ffmpeg-${RELEASE}-win64-gpl${MAJOR_MINOR_VERSION}.zip`,
		extractedDir: `ffmpeg-${RELEASE}-win64-gpl${MAJOR_MINOR_VERSION}`,
		targetDir: "win32-x64"
	},
	{
		name: "Windows ARM64",
		platform: "win32",
		arch: "arm64",
		url: `https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/ffmpeg-${RELEASE}-winarm64-gpl${MAJOR_MINOR_VERSION}.zip`,
		fileName: `ffmpeg-${RELEASE}-winarm64-gpl${MAJOR_MINOR_VERSION}.zip`,
		extractedDir: `ffmpeg-${RELEASE}-winarm64-gpl${MAJOR_MINOR_VERSION}`,
		targetDir: "win32-arm64"
	},
	{
		name: "Linux x64",
		platform: "linux",
		arch: "x64",
		url: `https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/ffmpeg-${RELEASE}-linux64-gpl${MAJOR_MINOR_VERSION}.tar.xz`,
		fileName: `ffmpeg-${RELEASE}-linux64-gpl${MAJOR_MINOR_VERSION}.tar.xz`,
		extractedDir: `ffmpeg-${RELEASE}-linux64-gpl${MAJOR_MINOR_VERSION}`,
		targetDir: "linux-x64"
	},
	{
		name: "Linux ARM64",
		platform: "linux",
		arch: "arm64",
		url: `https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/ffmpeg-${RELEASE}-linuxarm64-gpl${MAJOR_MINOR_VERSION}.tar.xz`,
		fileName: `ffmpeg-${RELEASE}-linuxarm64-gpl${MAJOR_MINOR_VERSION}.tar.xz`,
		extractedDir: `ffmpeg-${RELEASE}-linuxarm64-gpl${MAJOR_MINOR_VERSION}`,
		targetDir: "linux-arm64"
	}
];

const BTBN_CHECKSUMS_URL = `https://github.com/BtbN/FFmpeg-Builds/releases/download/${TAG}/checksums.sha256`;

// Helper functions
async function downloadFile(url, targetPath) {
	console.log(`  Downloading from ${url}...`);

	return new Promise((resolve, reject) => {
		https
			.get(
				url,
				{
					headers: { "User-Agent": "Nyte-FFmpeg-Downloader" }
				},
				(response) => {
					if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
						if (response.headers.location) {
							// Handle both absolute and relative redirect URLs
							let redirectUrl = response.headers.location;
							if (!redirectUrl.startsWith("http")) {
								// Relative URL - construct full URL from original
								const originalUrl = new URL(url);
								redirectUrl = `${originalUrl.protocol}//${originalUrl.host}${redirectUrl}`;
							}

							https
								.get(
									redirectUrl,
									{
										headers: { "User-Agent": "Nyte-FFmpeg-Downloader" }
									},
									(redirectResponse) => {
										streamPipeline(redirectResponse, createWriteStream(targetPath))
											.then(() => resolve())
											.catch(reject);
									}
								)
								.on("error", reject);
						} else {
							reject(new Error(`Redirect without location header: ${response.statusCode}`));
						}
					} else if (response.statusCode === 200) {
						streamPipeline(response, createWriteStream(targetPath))
							.then(() => resolve())
							.catch(reject);
					} else {
						reject(new Error(`Failed to download: ${response.statusCode}`));
					}
				}
			)
			.on("error", reject);
	});
}

async function fetchBtbNChecksums() {
	console.log("Fetching BtbN checksums...");

	return new Promise((resolve, reject) => {
		https
			.get(
				BTBN_CHECKSUMS_URL,
				{
					headers: { "User-Agent": "Nyte-FFmpeg-Downloader" }
				},
				(response) => {
					let data = "";

					response.on("data", (chunk) => (data += chunk));
					response.on("end", () => {
						try {
							const checksums = {};
							const lines = data.split("\n");
							for (const line of lines) {
								const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
								if (match) {
									checksums[match[2]] = match[1].toLowerCase();
								}
							}
							resolve(checksums);
						} catch (error) {
							reject(error);
						}
					});
				}
			)
			.on("error", reject);
	});
}

async function verifySha256(filePath, expectedHash) {
	console.log("  Verifying SHA256 checksum...");

	return new Promise((resolve) => {
		const hash = crypto.createHash("sha256");
		const stream = fs.createReadStream(filePath);

		stream.on("data", (data) => hash.update(data));
		stream.on("end", () => {
			const fileHash = hash.digest("hex");
			const isValid = fileHash === expectedHash;

			if (isValid) {
				console.log("  ✓ SHA256 verified");
			} else {
				console.error(`  ✗ SHA256 verification failed`);
				console.error(`    Expected: ${expectedHash}`);
				console.error(`    Got:      ${fileHash}`);
			}

			resolve(isValid);
		});
		stream.on("error", () => resolve(false));
	});
}

async function extractZip(zipPath, targetDir) {
	console.log("  Extracting ZIP...");

	return new Promise((resolve, reject) => {
		yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
			if (err || !zipfile) return reject(err);

			zipfile.readEntry();
			zipfile.on("entry", (entry) => {
				const entryPath = path.join(targetDir, entry.fileName);

				if (/\/$/.test(entry.fileName)) {
					// Directory entry
					fs.promises
						.mkdir(entryPath, { recursive: true })
						.then(() => {
							zipfile.readEntry();
						})
						.catch(reject);
				} else {
					// File entry
					fs.promises
						.mkdir(path.dirname(entryPath), { recursive: true })
						.then(() => {
							zipfile.openReadStream(entry, (err, readStream) => {
								if (err || !readStream) return reject(err);

								const writeStream = createWriteStream(entryPath);
								readStream.pipe(writeStream);
								writeStream.on("close", () => {
									// Set executable permissions on Unix-like systems
									if (
										process.platform !== "win32" &&
										(entry.fileName.includes("ffmpeg") || entry.fileName.includes("ffprobe"))
									) {
										fs.promises.chmod(entryPath, 0o755).catch(() => {});
									}
									zipfile.readEntry();
								});
								writeStream.on("error", reject);
							});
						})
						.catch(reject);
				}
			});

			zipfile.on("end", () => resolve());
			zipfile.on("error", reject);
		});
	});
}

async function extractTarXz(tarPath, targetDir) {
	console.log("  Extracting TAR.XZ...");

	try {
		await execAsync(`tar -xJf "${tarPath}" -C "${targetDir}"`);
	} catch (error) {
		throw new Error(`Failed to extract tar.xz: ${error.message}`);
	}
}

async function copyBinaries(extractedPath, targetPath, platformConfig) {
	console.log("  Copying binaries...");

	await fs.promises.mkdir(targetPath, { recursive: true });

	let binDir = path.join(extractedPath, platformConfig.extractedDir, "bin");

	const ext = platformConfig.platform === "win32" ? ".exe" : "";
	const ffmpegBin = path.join(binDir, `ffmpeg${ext}`);
	const ffprobeBin = path.join(binDir, `ffprobe${ext}`);

	if (fs.existsSync(ffmpegBin)) {
		await fs.promises.copyFile(ffmpegBin, path.join(targetPath, `ffmpeg${ext}`));
		console.log(`  ✓ Copied ffmpeg${ext}`);
	} else {
		throw new Error(`ffmpeg binary not found at ${ffmpegBin}`);
	}

	if (fs.existsSync(ffprobeBin)) {
		await fs.promises.copyFile(ffprobeBin, path.join(targetPath, `ffprobe${ext}`));
		console.log(`  ✓ Copied ffprobe${ext}`);
	} else {
		throw new Error(`ffprobe binary not found at ${ffprobeBin}`);
	}
}

async function downloadAndExtractPlatform(platformConfig, checksums, binariesDir, tempDir) {
	console.log(`\n📦 Processing ${platformConfig.name}...`);

	const downloadPath = path.join(tempDir, platformConfig.fileName);
	const extractPath = path.join(tempDir, platformConfig.targetDir);
	const targetPath = path.join(binariesDir, platformConfig.targetDir);

	try {
		// Download
		await downloadFile(platformConfig.url, downloadPath);

		// Verify (if checksums available)
		if (checksums && checksums[platformConfig.fileName]) {
			const isValid = await verifySha256(downloadPath, checksums[platformConfig.fileName]);
			if (!isValid) {
				throw new Error("Checksum verification failed");
			}
		}

		// Extract
		await fs.promises.mkdir(extractPath, { recursive: true });
		if (platformConfig.fileName.endsWith(".zip")) {
			await extractZip(downloadPath, extractPath);
		} else if (platformConfig.fileName.endsWith(".tar.xz")) {
			await extractTarXz(downloadPath, extractPath);
		}

		// Copy binaries to final location
		await copyBinaries(extractPath, targetPath, platformConfig);

		// Cleanup
		await fs.promises.unlink(downloadPath).catch(() => {});
		await fs.promises.rm(extractPath, { recursive: true, force: true }).catch(() => {});

		console.log(`✅ ${platformConfig.name} complete`);
		return true;
	} catch (error) {
		console.error(`❌ ${platformConfig.name} failed: ${error.message}`);
		return false;
	}
}

async function main() {
	const rootDir = path.join(__dirname, "..");
	const binariesDir = path.join(rootDir, "bin", "ffmpeg");
	const tempDir = path.join(rootDir, ".ffmpeg-temp");

	// Remove old binaries directory if it exists
	await fs.promises.rm(binariesDir, { recursive: true, force: true }).catch(() => {});
	// Create directories
	await fs.promises.mkdir(binariesDir, { recursive: true });
	await fs.promises.mkdir(tempDir, { recursive: true });

	// Fetch checksums for BtbN builds
	let checksums = null;
	try {
		checksums = await fetchBtbNChecksums();
		console.log("✓ Checksums fetched\n");
	} catch {
		console.warn("⚠ Could not fetch checksums, proceeding without verification\n");
	}

	// Download and extract all platforms
	const results = [];
	for (const platform of PLATFORMS) {
		const success = await downloadAndExtractPlatform(platform, checksums, binariesDir, tempDir);
		results.push({ platform: platform.name, success });
	}

	// Cleanup temp directory
	await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => {});

	// Summary
	console.log("\n" + "=".repeat(50));
	console.log("📊 Summary:");
	console.log("=".repeat(50));

	const successful = results.filter((r) => r.success).length;
	const failed = results.filter((r) => !r.success).length;

	results.forEach((r) => {
		console.log(`${r.success ? "✅" : "❌"} ${r.platform}`);
	});

	console.log("\n" + "=".repeat(50));
	console.log(`Total: ${successful} successful, ${failed} failed`);
	console.log("=".repeat(50));

	// Write tag and release info to a file in the binaries directory
	const infoFile = path.join(binariesDir, "ffmpeg-release-info.txt");
	const infoContent = `TAG=${TAG}\nRELEASE=${RELEASE}\n`;
	await fs.promises.writeFile(infoFile, infoContent, "utf8");

	if (failed > 0) {
		console.log("\n⚠ Some downloads failed. Please check the errors above.");
		process.exit(1);
	} else {
		console.log("\n✅ All binaries downloaded successfully!");
		console.log(`📁 Binaries saved to: ${binariesDir}`);
		console.log(`ℹ️  Release info written to: ${infoFile}`);
	}
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
