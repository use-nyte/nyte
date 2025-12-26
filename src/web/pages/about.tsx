import { Link } from "react-router";

export function meta() {
	return [{ title: "Nyte - About" }, { name: "description", content: "About Nyte" }];
}

export default function About() {
	return (
		<div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
			<h1>About Nyte</h1>
			<p>This is the about page.</p>
			<nav>
				<Link to="/">Back to Home</Link>
			</nav>
		</div>
	);
}
