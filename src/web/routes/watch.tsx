import VideoJS from "../components/video-js";

export function meta() {
	return [{ title: "Nyte - Watch" }, { name: "description", content: "Welcome to Nyte!" }];
}

export async function loader({ params }: { params: { videoId: string } }) {
	return params;
}

export default function Watch({ loaderData }: { loaderData: { videoId: string } }) {
	return (
		<div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<VideoJS
				options={{
					autoplay: true,
					controls: true,
					responsive: true,
					fluid: true,
					sources: [
						{
							src: `/api/videos/${loaderData.videoId}`,
							type: "video/mp4"
						}
					]
				}}
			/>
		</div>
	);
}
