import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
	publicDir: "src/web/assets",
	plugins: [
		tailwindcss(),
		reactRouter(),
		tsconfigPaths({
			projects: ["./tsconfig.web.json"]
		})
	],
	resolve: {
		alias: {
			"~": "/src/web"
		}
	},
	server: {
		proxy: {
			"/api": {
				target: "http://localhost:3000",
				changeOrigin: true
			}
		}
	}
});
