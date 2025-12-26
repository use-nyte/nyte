import { existsSync, rmSync, renameSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const source = join(__dirname, "..", "dist", "web-build");
const target = join(__dirname, "..", "dist", "web");

if (existsSync(target)) {
	rmSync(target, { recursive: true });
}

renameSync(source, target);

console.log("✓ Moved web build to dist/web");
