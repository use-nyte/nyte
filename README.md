# nyte

This repository assembles three container images from the current server and web `main` branches. The browser and backend can run on one origin in the combined
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
to the GitHub Packages dependencies. Then run the builds from the locally fetched `origin/main` refs:

```bash
set -euo pipefail
for component in nyte-server nyte-web; do
  commit="$(git -C "../$component" rev-parse origin/main)"
  mkdir -p "components/$component"
  git -C "../$component" archive "$commit" | tar -x -C "components/$component"
done
for target in nyte-server nyte-web nyte; do
  docker build --secret id=npm_token,env=NODE_AUTH_TOKEN --target "$target" --tag "$target:baseline" .
done
bash packaging/smoke.sh
```

Use empty `components/nyte-server` and `components/nyte-web` work directories for a fresh extraction
after updating the component checkouts. The smoke test covers liveness through all three images, SPA route reloads, and
404 responses for missing API routes and assets.

## Publication

Pull requests build and smoke-test all three images. A successful push to `main` in
`nyte-server` or `nyte-web` sends a dispatch after component CI passes. Packaging checks out
both current component `main` branches and rebuilds all three images so the combined image
uses the same pair tested together. Pushes to packaging `main` also run the nightly pipeline.

Successful nightly runs publish `nightly` and a tag containing the packaging, server, and web
commit SHAs. A successful packaging `vX.Y.Z` tag push builds the current component heads and
publishes the version and `latest` tags. Image labels record the component revisions.

The component workflows need the Nyte Automation client ID and private key. The App must be
installed on the packaging repository with Contents write access to send the dispatch.
The packaging repository token needs read access to the build dependencies and write access
to the three GHCR packages.
