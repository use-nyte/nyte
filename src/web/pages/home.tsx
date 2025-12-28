export function meta() {
	return [{ title: "Nyte - Home" }, { name: "description", content: "Welcome to Nyte!" }];
}

export async function loader({ request }: { request: Request }) {
	const url = new URL(request.url);
	const apiUrl = `${url.protocol}//${url.host}/api/videos`;
	return fetch(apiUrl).then((res) => res.json());
}

export default function Home({ loaderData }: { loaderData: string[] }) {
	return (
		<div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1>Videos</h1>
			<ul>
				{loaderData.map((video: string, index: number) => (
					<li key={index} style={{ marginBottom: "1rem" }}>
						<a href={`/api/videos/${video}`} style={{ textDecoration: "none", color: "blue" }}>
							<h2>{video}</h2>
						</a>
					</li>
				))}
			</ul>
		</div>
	);
}
