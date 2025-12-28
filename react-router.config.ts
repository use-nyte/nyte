import type { Config } from "@react-router/dev/config";

export default {
	appDirectory: "src/web",
	buildDirectory: "dist/web-build",
	ssr: true,
	serverBuildFile: "index.mjs"
} satisfies Config;
