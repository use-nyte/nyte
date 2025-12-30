import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [index("routes/home.tsx"), route("/watch/:videoId", "routes/watch.tsx")] satisfies RouteConfig;
