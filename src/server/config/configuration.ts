export default function configuration() {
	return {
		nodeEnv: process.env.NODE_ENV || "development",
		port: Number.parseInt(process.env.PORT || "3000", 10),
		media: {
			directories: process.env.MEDIA_DIRECTORIES?.split(",").map((dir) => dir.trim()) || []
		},
		cors: {
			origin: process.env.CORS_ORIGIN || "http://localhost:5173"
		}
	};
}
