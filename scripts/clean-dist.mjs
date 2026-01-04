import { existsSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, "..", "dist");

if (existsSync(distDir)) {
	rmSync(distDir, { recursive: true, force: true });
	console.log("✓ Cleaned dist directory");
} else {
	console.log("✓ No dist directory to clean");
}
