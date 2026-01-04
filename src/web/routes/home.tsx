import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { ButtonGroup } from "~/components/ui/button-group";
import { Video } from "../../server/video/entities/video.entity";

const PAGE_SIZE = 20;

export function meta() {
	return [{ title: "Nyte - Home" }, { name: "description", content: "Welcome to Nyte!" }];
}

export async function loader({ request }: { request: Request }) {
	const url = new URL(request.url);
	const apiUrl = `${url.protocol}//${url.host}/api/videos?take=${PAGE_SIZE}&skip=0`;
	return fetch(apiUrl).then((res) => res.json());
}

export default function Home({ loaderData }: { loaderData: Video[] }) {
	const [page, setPage] = useState(1);
	const [videos, setVideos] = useState<Video[]>(loaderData);
	return (
		<div className="p-4 font-sans">
			<h1 className="text-3xl font-bold underline">Videos</h1>
			<ul>
				{videos.map((video: Video, index: number) => (
					<li key={index} className="my-4">
						<a href={`/watch/${video.id}`} className="text-blue-500">
							<h2>{video.filePath}</h2>
						</a>
					</li>
				))}
			</ul>
			<ButtonGroup>
				<Button
					onClick={() => {
						if (page === 1) return;
						setPage(page - 1);
						fetch(`/api/videos?take=${PAGE_SIZE}&skip=${(page - 2) * PAGE_SIZE}`)
							.then((res) => res.json())
							.then((data) => setVideos(data));
					}}
				>
					<ArrowLeftIcon />
				</Button>
				<Button
					onClick={() => {
						setPage(page + 1);
						fetch(`/api/videos?take=${PAGE_SIZE}&skip=${page * PAGE_SIZE}`)
							.then((res) => res.json())
							.then((data) => {
								if (data.length === 0) {
									setPage(page);
									return;
								} else {
									setVideos(data);
								}
							});
					}}
				>
					<ArrowRightIcon />
				</Button>
			</ButtonGroup>
		</div>
	);
}
