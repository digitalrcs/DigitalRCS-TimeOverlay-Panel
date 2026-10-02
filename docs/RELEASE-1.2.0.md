# Version 1.2.0 release preparation

Prepared October 2, 2026. Plugin ID remains `digitalrcs-timeoverlay-panel`.

**Release scope: independent zoom, targeted dependency remediation, and a signed GitHub release for Grafana catalog review.**

## Release description

Time Overlay now offers **Zoom behavior: This panel only / Entire dashboard**. Panel-only zoom is the default, including for existing panels without a saved setting. Drag selection, double-click zoom-out, and toolbar zoom explore the loaded data without changing the dashboard time picker, querying again, or changing other panels. Zoom all restores the panel's current dashboard range (or its configured time override). Choose Entire dashboard to retain the previous shared-range behavior.

The local viewport resets on incoming time-range changes, mode changes, or panel reload. A relative range that advances on refresh also resets the viewport. Zooming does not retrieve finer-resolution samples. Range timestamps and durations are preserved; ranges outside the viewport are hidden. Notes stay in their relative panel positions. The viewport is temporary and is not persisted in dashboard JSON or a separately generated Grafana render.

This version also includes the existing local fix that makes duration editors clickable in Select mode.

## Verified locally

- Production webpack build, TypeScript checks, ESLint, and unit tests.
- Grafana **13.1.3**, user's running Docker container at `http://localhost:3001`: **8 Playwright checks passed**, including authentication, the four existing panel regressions, and three zoom regressions.
- Grafana **12.3.0**, temporary Docker container: **4 Playwright checks passed**, including authentication and the three zoom regressions. The temporary container was removed afterward.
- Browser tests use `@grafana/plugin-e2e` with Chromium. The zoom assertions read the actual uPlot x-axis scale, not just React state. The isolation test verifies the comparison panel, unchanged URL time range, and **zero additional `/api/ds/query` requests**.
- Panel mode switch, existing range and note preservation, local reset, and dashboard time-picker changes exercised.
- All nine archive files checked byte-for-byte against the Docker-tested `dist` files using SHA256.
- Grafana plugin validator returned exit code 0 for the local ZIP, with warnings for an unsigned package and a GitHub deployment-document link returning HTTP 503. This local check did not validate a published source tag or provenance attestation.
- The deployment document was subsequently confirmed to exist through GitHub's repository API.
- Dependency remediation cleared all high and low findings. Four moderate upstream Grafana Router dependency findings remain; see [Dependency review](DEPENDENCY-REVIEW.md) for the distribution-scope assessment. The source audit is not represented as clean.

## Release artifacts

Use the final signed ZIP and its checksums from the v1.2.0 GitHub Release. Earlier unsigned candidate ZIPs under output/1.2.0 are superseded and must not be submitted.

## Public-release procedure

1. Review and commit the prepared source, tests, version files, changelog, and documentation, preserving the pre-existing duration-input fix and regression test edits.
2. Include the dependency review with the release, push the reviewed changes, and complete the repository CI compatibility matrix.
3. Create and push tag `v1.2.0` at that tested commit. The existing Release workflow builds the archive and attestation; Community signing requires the existing `GRAFANA_PUBLIC_SIGNING_ENABLED` repository variable and `GRAFANA_ACCESS_POLICY_TOKEN` secret to be configured.
4. Download the workflow's final signed ZIP; verify plugin ID/version, MANIFEST file hashes, checksums, and GitHub provenance against the exact tag. Run Grafana's validator again with the published source URL and SHA1 checksum. Local unsigned checksums above must not be reused for the signed ZIP.
5. Submit the update through Grafana using the final release ZIP URL and source tag URL. Use the release description above. Publish the matching `docs/wiki` changes to the wiki when releasing.

The Grafana catalog update is a separate submission after publication of the signed GitHub release. Grafana must restart after installation so the new plugin metadata is loaded. The local Docker environment has already been restarted for this version.

## Scope of testing

Desktop Chromium at 1280 × 720; other browsers, mobile layouts, image-renderer/PDF exports, streaming sources, and the full CI version matrix were not tested in this local run.
