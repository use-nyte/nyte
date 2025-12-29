import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { exec } from "child_process";
import https from "https";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { pipeline } from "stream";
import { createWriteStream } from "fs";
import crypto from "crypto";
import yauzl from "yauzl";

const streamPipeline = promisify(pipeline);
const execAsync = promisify(exec);

@Injectable()
export class FfmpegDownloaderService implements OnModuleInit {
    private readonly logger = new Logger(FfmpegDownloaderService.name, { timestamp: true });

    private readonly FFMPEG_PUBLIC_KEY_URL = "https://ffmpeg.org/ffmpeg-devel.asc";
    private readonly FFMPEG_PUBLIC_KEY_FINGERPRINT = "FCF986EA15E6E293A5644F10B4322F04D67658D8";

    private getArchitecture(): 'x64' | 'arm64' {
        return process.arch === 'arm64' ? 'arm64' : 'x64';
    }

    private getFfmpegUrl(): string {
        const platform = process.platform;
        const arch = this.getArchitecture();

        if (platform === 'win32') {
            return arch === 'arm64'
                ? "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-winarm64-gpl.zip"
                : "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip";
        } else if (platform === 'linux') {
            return arch === 'arm64'
                ? "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linuxarm64-gpl.tar.xz"
                : "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz";
        } else if (platform === 'darwin') {
            // evermeet.cx handles architecture automatically
            return "https://evermeet.cx/ffmpeg/get/zip";
        }

        throw new Error(`Unsupported platform: ${platform}`);
    }

    private getFfmpegFileName(): string {
        const platform = process.platform;
        const arch = this.getArchitecture();

        if (platform === 'win32') {
            return arch === 'arm64' 
                ? "ffmpeg-master-latest-winarm64-gpl.zip" 
                : "ffmpeg-master-latest-win64-gpl.zip";
        } else if (platform === 'linux') {
            return arch === 'arm64'
                ? "ffmpeg-master-latest-linuxarm64-gpl.tar.xz"
                : "ffmpeg-master-latest-linux64-gpl.tar.xz";
        }

        return path.basename(this.getFfmpegUrl());
    }

    private getFfmpegExecutablePath(ffmpegDir: string): string {
        const platform = process.platform;
        const arch = this.getArchitecture();
        const ext = platform === 'win32' ? '.exe' : '';

        if (platform === 'win32') {
            // Windows: ffmpeg-master-latest-win64-gpl/bin/ffmpeg.exe (or winarm64)
            const archSuffix = arch === 'arm64' ? 'arm' : '';
            return path.join(ffmpegDir, `ffmpeg-master-latest-win${archSuffix}64-gpl`, 'bin', `ffmpeg${ext}`);
        } else if (platform === 'linux') {
            // Linux: ffmpeg-master-latest-linux64-gpl/bin/ffmpeg (or linuxarm64)
            const archSuffix = arch === 'arm64' ? 'arm' : '';
            return path.join(ffmpegDir, `ffmpeg-master-latest-linux${archSuffix}64-gpl`, 'bin', `ffmpeg${ext}`);
        } else if (platform === 'darwin') {
            // macOS from evermeet.cx extracts to just ffmpeg
            return path.join(ffmpegDir, 'ffmpeg');
        }

        throw new Error(`Unsupported platform: ${platform}`);
    }

    // Signature URLs (only available for macOS)
    private readonly FFMPEG_SIGNATURE_URLS = {
        darwin: "https://evermeet.cx/ffmpeg/get/zip/sig"
    };

    // BtbN GitHub release info for Windows/Linux builds
    private readonly BTBN_RELEASE_INFO = {
        owner: "BtbN",
        repo: "FFmpeg-Builds",
        tag: "latest",
        checksumsFile: "checksums.sha256"
    };

    async fetchBtbNSha256(_platform: 'win32' | 'linux'): Promise<string | null> {
        try {
            const fileName = this.getFfmpegFileName();
            this.logger.log(`Fetching SHA256 for ${fileName} from BtbN release...`);
            
            const url = `https://github.com/${this.BTBN_RELEASE_INFO.owner}/${this.BTBN_RELEASE_INFO.repo}/releases/download/${this.BTBN_RELEASE_INFO.tag}/${this.BTBN_RELEASE_INFO.checksumsFile}`;
            
            return new Promise((resolve) => {
                https.get(url, {
                    headers: {
                        'User-Agent': 'Nyte-FFmpeg-Downloader'
                    }
                }, (response) => {
                    let data = '';
                    
                    response.on('data', (chunk) => data += chunk);
                    response.on('end', () => {
                        try {
                            // Parse checksums file (format: "hash  filename")
                            const lines = data.split('\n');
                            for (const line of lines) {
                                const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
                                if (match && match[2] === fileName) {
                                    const hash = match[1].toLowerCase();
                                    this.logger.log(`Found SHA256: ${hash}`);
                                    resolve(hash);
                                    return;
                                }
                            }
                            
                            this.logger.warn(`SHA256 not found for ${fileName} in checksums file`);
                            resolve(null);
                        } catch (error) {
                            this.logger.error('Error parsing checksums file:', error);
                            resolve(null);
                        }
                    });
                }).on('error', (error) => {
                    this.logger.error('Error fetching checksums:', error);
                    resolve(null);
                });
            });
        } catch (error) {
            this.logger.error('Error in fetchBtbNSha256:', error);
            return null;
        }
    }

    async onModuleInit(): Promise<void> {
        this.logger.log("Checking for ffmpeg installation...");
        this.logger.log(`Platform: ${process.platform}, Architecture: ${this.getArchitecture()}`);
        
        const ffmpegDir = path.join(process.cwd(), "ffmpeg");
        const ffmpegExecutable = this.getFfmpegExecutablePath(ffmpegDir);
        
        // Check if the extracted executable exists
        if (fs.existsSync(ffmpegExecutable)) {
            this.logger.log("✓ ffmpeg is already installed.");
        } else {
            this.logger.log("ffmpeg not found, downloading...");
            await this.downloadAndVerifyFfmpeg(ffmpegDir);
            await this.extractFfmpeg(ffmpegDir);
            this.logger.log("ffmpeg downloaded, verified, and extracted successfully.");
        }
    }

    private async extractZip(zipPath: string, targetDir: string): Promise<void> {
        this.logger.log(`Extracting ${path.basename(zipPath)}...`);
        
        return new Promise((resolve, reject) => {
            yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
                if (err || !zipfile) return reject(err);

                zipfile.readEntry();
                zipfile.on('entry', (entry) => {
                    const entryPath = path.join(targetDir, entry.fileName);

                    if (/\/$/.test(entry.fileName)) {
                        // Directory entry
                        fs.promises.mkdir(entryPath, { recursive: true }).then(() => {
                            zipfile.readEntry();
                        }).catch(reject);
                    } else {
                        // File entry
                        fs.promises.mkdir(path.dirname(entryPath), { recursive: true }).then(() => {
                            zipfile.openReadStream(entry, (err, readStream) => {
                                if (err || !readStream) return reject(err);

                                const writeStream = createWriteStream(entryPath);
                                readStream.pipe(writeStream);
                                writeStream.on('close', () => {
                                    // Set executable permissions on Unix-like systems
                                    if (process.platform !== 'win32' && entry.fileName.includes('ffmpeg')) {
                                        fs.promises.chmod(entryPath, 0o755).catch(() => {});
                                    }
                                    zipfile.readEntry();
                                });
                                writeStream.on('error', reject);
                            });
                        }).catch(reject);
                    }
                });

                zipfile.on('end', () => resolve());
                zipfile.on('error', reject);
            });
        });
    }

    private async extractTarXz(tarPath: string, targetDir: string): Promise<void> {
        this.logger.log(`Extracting ${path.basename(tarPath)}...`);
        
        try {
            await execAsync(`tar -xJf "${tarPath}" -C "${targetDir}"`);
        } catch (error) {
            throw new Error(`Failed to extract tar.xz: ${error}`);
        }
    }

    private async extractFfmpeg(ffmpegDir: string): Promise<void> {
        const fileName = this.getFfmpegFileName();
        const filePath = path.join(ffmpegDir, fileName);

        if (fileName.endsWith('.zip')) {
            await this.extractZip(filePath, ffmpegDir);
        } else if (fileName.endsWith('.tar.xz')) {
            await this.extractTarXz(filePath, ffmpegDir);
        } else {
            throw new Error(`Unsupported archive format: ${fileName}`);
        }

        // Clean up the archive file after extraction
        await fs.promises.unlink(filePath).catch(() => {});
        
        this.logger.log('Extraction complete');
    }

    async downloadFfmpeg(targetDir: string): Promise<string> {
        const downloadUrl = this.getFfmpegUrl();

        // Ensure target directory exists
        await fs.promises.mkdir(targetDir, { recursive: true });

        const fileName = this.getFfmpegFileName();
        const filePath = path.join(targetDir, fileName);

        this.logger.log(`Downloading ffmpeg from ${downloadUrl}...`);

        return new Promise((resolve, reject) => {
            https.get(downloadUrl, (response) => {
                // Handle all redirect status codes (301, 302, 303, 307, 308)
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
                    if (response.headers.location) {
                        https.get(response.headers.location, (redirectResponse) => {
                            // Check if the redirect response is also a redirect
                            if (redirectResponse.statusCode && redirectResponse.statusCode >= 300 && redirectResponse.statusCode < 400) {
                                reject(new Error(`Too many redirects: ${redirectResponse.statusCode}`));
                                return;
                            }
                            streamPipeline(redirectResponse, createWriteStream(filePath))
                                .then(() => {
                                    this.logger.log(`Downloaded ffmpeg to ${filePath}`);
                                    resolve(filePath);
                                })
                                .catch(reject);
                        }).on('error', reject);
                    } else {
                        reject(new Error(`Redirect without location header: ${response.statusCode}`));
                    }
                } else if (response.statusCode === 200) {
                    streamPipeline(response, createWriteStream(filePath))
                        .then(() => {
                            this.logger.log(`Downloaded ffmpeg to ${filePath}`);
                            resolve(filePath);
                        })
                        .catch(reject);
                } else {
                    reject(new Error(`Failed to download: ${response.statusCode}`));
                }
            }).on('error', reject);
        });
    }

    private async downloadFile(url: string, targetPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            https.get(url, (response) => {
                if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400) {
                    if (response.headers.location) {
                        https.get(response.headers.location, (redirectResponse) => {
                            streamPipeline(redirectResponse, createWriteStream(targetPath))
                                .then(() => resolve())
                                .catch(reject);
                        }).on('error', reject);
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
            }).on('error', reject);
        });
    }

    private async checkGpgInstalled(): Promise<boolean> {
        try {
            await execAsync('gpg --version');
            return true;
        } catch {
            return false;
        }
    }

    private async importPublicKey(): Promise<void> {
        this.logger.log('Importing FFmpeg public PGP key...');
        const keyPath = path.join(process.cwd(), 'ffmpeg-devel.asc');
        
        await this.downloadFile(this.FFMPEG_PUBLIC_KEY_URL, keyPath);
        await execAsync(`gpg --import "${keyPath}"`);
        await fs.promises.unlink(keyPath);
        
        this.logger.log('FFmpeg public key imported successfully');
    }

    private async verifySha256(filePath: string, expectedHash: string): Promise<boolean> {
        this.logger.log('Verifying SHA256 checksum...');
        
        return new Promise((resolve) => {
            const hash = crypto.createHash('sha256');
            const stream = fs.createReadStream(filePath);
            
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => {
                const fileHash = hash.digest('hex');
                const isValid = fileHash === expectedHash;
                
                if (isValid) {
                    this.logger.log('✓ SHA256 checksum verified successfully');
                } else {
                    this.logger.error(`✗ SHA256 verification failed`);
                    this.logger.error(`Expected: ${expectedHash}`);
                    this.logger.error(`Got:      ${fileHash}`);
                }
                
                resolve(isValid);
            });
            stream.on('error', () => resolve(false));
        });
    }

    async verifySignature(filePath: string, signaturePath: string): Promise<boolean> {
        const hasGpg = await this.checkGpgInstalled();
        
        if (!hasGpg) {
            this.logger.warn('GPG not installed - skipping signature verification. Install GPG to verify downloads.');
            return true; // Skip verification if GPG not available
        }

        try {
            // Try to import the key (will skip if already imported)
            await this.importPublicKey().catch(() => {
                this.logger.log('Public key already imported');
            });

            // Verify the signature
            const { stdout, stderr } = await execAsync(`gpg --verify "${signaturePath}" "${filePath}"`);
            
            const output = stdout + stderr;
            if (output.includes('Good signature') && output.includes(this.FFMPEG_PUBLIC_KEY_FINGERPRINT)) {
                this.logger.log('✓ Signature verified successfully');
                return true;
            } else {
                this.logger.error('✗ Signature verification failed');
                return false;
            }
        } catch (error) {
            this.logger.error('Error verifying signature:', error);
            return false;
        }
    }
    
    /**
     * Get the full path to the ffmpeg executable
     */
    getFfmpegPath(): string {
        const ffmpegDir = path.join(process.cwd(), "ffmpeg");
        return this.getFfmpegExecutablePath(ffmpegDir);
    }

    /**
     * Get the full path to the ffprobe executable
     */
    getFfprobePath(): string {
        const ffmpegDir = path.join(process.cwd(), "ffmpeg");
        const platform = process.platform;
        const arch = this.getArchitecture();
        const ext = platform === 'win32' ? '.exe' : '';

        if (platform === 'win32') {
            const archSuffix = arch === 'arm64' ? 'arm' : '';
            return path.join(ffmpegDir, `ffmpeg-master-latest-win${archSuffix}64-gpl`, 'bin', `ffprobe${ext}`);
        } else if (platform === 'linux') {
            const archSuffix = arch === 'arm64' ? 'arm' : '';
            return path.join(ffmpegDir, `ffmpeg-master-latest-linux${archSuffix}64-gpl`, 'bin', `ffprobe${ext}`);
        } else if (platform === 'darwin') {
            return path.join(ffmpegDir, 'ffprobe');
        }

        throw new Error(`Unsupported platform: ${platform}`);
    }

    async downloadAndVerifyFfmpeg(targetDir: string): Promise<string> {
        const filePath = await this.downloadFfmpeg(targetDir);
        
        // Verify using SHA256 for Windows and Linux (BtbN builds)
        if (process.platform === 'win32' || process.platform === 'linux') {
            const sha256 = await this.fetchBtbNSha256(process.platform);
            
            if (sha256) {
                const isValid = await this.verifySha256(filePath, sha256);
                
                if (!isValid) {
                    throw new Error('FFmpeg SHA256 verification failed - file may be compromised');
                }
            } else {
                this.logger.warn('Could not fetch SHA256 from BtbN - skipping verification');
            }
        }
        // Verify using PGP signature for macOS
        else if (this.FFMPEG_SIGNATURE_URLS[process.platform]) {
            const signaturePath = filePath + '.asc';
            
            this.logger.log('Downloading signature file...');
            await this.downloadFile(this.FFMPEG_SIGNATURE_URLS[process.platform], signaturePath);
            
            const isValid = await this.verifySignature(filePath, signaturePath);
            
            // Clean up signature file
            await fs.promises.unlink(signaturePath).catch(() => {});
            
            if (!isValid) {
                throw new Error('FFmpeg signature verification failed - file may be compromised');
            }
        } else {
            this.logger.warn(`No verification available for ${process.platform}`);
        }
        
        return filePath;
    }

}