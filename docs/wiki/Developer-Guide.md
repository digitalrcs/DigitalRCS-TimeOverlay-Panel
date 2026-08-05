# Developer guide

## Architecture

The plugin is frontend-only and uses Grafana's standard panel plugin API.

- `src/plugin.json` defines the plugin identity and metadata.
- `src/module.ts` registers the panel, standard field options, and custom editor options.
- `src/components/TimeOverlayPanel.tsx` owns the Grafana time-series renderer, toolbar, zoom behavior, range overlays, notes, and export-route behavior.
- `src/data/normalizeTimeSeriesFrames.ts` preserves valid Grafana frames and provides a fallback for untyped tables.
- `src/types.ts` defines the persisted range, note, and panel option contracts.
- `tests` contains Grafana end-to-end tests and fixtures.
- `provisioning` contains the local datasource and editable example-dashboard inputs.

The renderer receives data through `PanelProps`; it never connects directly to a datasource. Correctly typed Grafana frames pass through unchanged so labels, links, units, metadata, and datasource-specific field settings remain intact.

## Prerequisites

- WSL on Windows or a supported Linux/macOS environment.
- Node.js matching `.nvmrc` and npm matching `package.json`.
- Docker Desktop or Docker Engine with Compose.
- Git and GitHub CLI for repository workflows.

## Local workflow

```bash
cd /mnt/c/Data/GrafanaCode/digitalrcs-timeoverlay-panel
npm ci
npm run dev
```

In another terminal:

```bash
docker compose up -d --build
```

Open `http://localhost:3001`. The local Compose configuration bind-mounts:

- `dist` into the Grafana plugin directory.
- `provisioning` into Grafana's provisioning directory.
- `.local/grafana-data` into `/var/lib/grafana` for persistent local state.

The example dashboard is imported through the Grafana HTTP API so UI edits can be saved.

## Validation

Run before publishing changes:

```bash
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

Use `npm run e2e` with the Grafana test environment for interaction changes. Test the supported Grafana-version matrix in GitHub Actions. For visual changes, also verify a normal dashboard, hover tooltips, zoom, saved overlays, and the organization's image/PDF renderer.

## Adding options safely

1. Extend `TimeOverlayOptions` in `src/types.ts`.
2. Register the editor control and a backward-compatible default in `src/module.ts`.
3. Treat missing values as defaults when reading existing dashboard JSON.
4. Add focused unit tests and interaction coverage.
5. Confirm export rendering does not depend on editor-only controls.

## Packaging and releases

`npm run build` produces `dist`, which is the deployable frontend plugin. Release archives must contain a top-level directory named `digitalrcs-timeoverlay-panel`. The GitHub release workflow validates plugin metadata and packages tagged versions.

The plugin is expected to be unsigned unless it is privately signed for approved root URLs or published in Grafana's catalog. Never commit signing tokens or production credentials. See the [deployment guide](Deployment) for the release and installation paths.

## Contribution workflow

The default branch is protected. Create a feature branch, commit focused changes, open a pull request, and wait for the required build/lint/unit-test check. Keep documentation and changelog entries synchronized with user-visible behavior.
