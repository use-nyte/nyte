# nyte

This repository assembles three container images from the exact server and web commits in
[`components.json`](components.json). The browser and backend can run on one origin in the combined
image or in separate containers on the same Docker network.

| Image | Port | Runtime |
| --- | --- | --- |
| `ghcr.io/use-nyte/nyte-server` | `52470` | NestJS backend |
| `ghcr.io/use-nyte/nyte-web` | `52471` | Static web app with a liveness proxy |
| `ghcr.io/use-nyte/nyte` | `52470` | One NestJS process serving the app and API |

For the combined image, run `docker run --rm -p 127.0.0.1:52470:52470 ghcr.io/use-nyte/nyte:nightly`.
For separate containers, put both on the same user-defined Docker network and give the server the
network alias `nyte-server`. The web image accepts `NYTE_SERVER_URL` as an upstream origin, for example
`http://nyte-server:52470`.

## Build and test locally

From a Nyte workspace with sibling server and web checkouts, export `NODE_AUTH_TOKEN` with access
to the GitHub Packages dependencies. Then run the exact pinned builds:

```bash
set -euo pipefail
for component in nyte-server nyte-web; do
  commit="$(jq -er --arg component "$component" '.[$component]' components.json)"
  mkdir -p "components/$component"
  git -C "../$component" archive "$commit" | tar -x -C "components/$component"
done
for target in nyte-server nyte-web nyte; do
  docker build --secret id=npm_token,env=NODE_AUTH_TOKEN --target "$target" --tag "$target:baseline" .
done
bash packaging/smoke.sh
```

Use empty `components/nyte-server` and `components/nyte-web` work directories for a fresh extraction
after changing pins. The smoke test covers liveness through all three images, SPA route reloads, and
404 responses for missing API routes and assets.

## Publication

Pull requests build and smoke-test all three images. A successful `main` push publishes the same
tested images under `nightly` and `sha-<packaging commit>`. A successful `vX.Y.Z` tag push publishes
the version and `latest` tags. The workflow uses the repository token, so the packaging repository
needs read access to the build dependencies and write access to the three image packages.
