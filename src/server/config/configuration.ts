export default function configuration() {
	return {
		nodeEnv: process.env.NODE_ENV || "development",
		port: Number.parseInt(process.env.PORT || "3000", 10),
		cors: {
			origin: process.env.CORS_ORIGIN || "http://localhost:5173"
		},
		filesystem: {
			mediaDirectory: process.env.MEDIA_DIRECTORY
		}
	};
}
