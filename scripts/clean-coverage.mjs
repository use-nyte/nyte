import { existsSync, rmSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const coverageDir = join(__dirname, "..", "coverage");

if (existsSync(coverageDir)) {
	rmSync(coverageDir, { recursive: true, force: true });
	console.log("✓ Cleaned coverage directory");
} else {
	console.log("✓ No coverage directory to clean");
}
