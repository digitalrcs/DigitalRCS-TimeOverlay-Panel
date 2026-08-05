# Grafana plugin signing guide

This guide explains how to sign and package `digitalrcs-timeoverlay-panel` for controlled deployment. It is designed to be usable outside GitHub and was verified against Grafana's official plugin documentation on August 5, 2026.

## Executive decision

Grafana plugin signing is different from TLS, X.509, Authenticode, or a self-signed certificate. Grafana verifies a signed `MANIFEST.txt` generated through Grafana's plugin-signing service.

Choose one distribution route:

| Route                    | Appropriate use                                           | Root URLs                   | Catalog review                         |
| ------------------------ | --------------------------------------------------------- | --------------------------- | -------------------------------------- |
| **Private signature**    | Controlled use on specifically approved Grafana instances | Required                    | No public catalog publication          |
| **Community signature**  | Open-source, noncommercial public plugin                  | Not supplied after approval | Grafana review and catalog publication |
| **Commercial signature** | Commercially backed or closed-source dependent technology | Not supplied after approval | Grafana review and catalog publication |

For a controlled internal installation, a private signature is normally the most direct technical route. Before proceeding, the distributing and receiving organizations should confirm that the intended distribution complies with Grafana's current plugin policy and their internal third-party software requirements.

## Readiness status for this project

The repository already contains:

- A valid panel plugin ID: `digitalrcs-timeoverlay-panel`.
- A production build command: `npm run build`.
- Grafana's signing package: `@grafana/sign-plugin`.
- A signing command: `npm run sign`.
- Plugin metadata, license, README, changelog, logos, and Grafana dependency information.
- Type checking, linting, unit tests, packaging, compatibility checks, and a tag-triggered release workflow.
- A frontend-only plugin, so no platform-specific executable signing is required.

Items that must still be obtained or confirmed before signing:

1. A Grafana Cloud organization whose slug matches the plugin ID prefix `digitalrcs`.
2. Administrator access to that Grafana Cloud organization.
3. A Grafana Access Policy token with realm `digitalrcs` (all-stacks) and scope `plugins:write`.
4. The exact externally visible Grafana `root_url` value for every approved private installation, including scheme, host, port when applicable, and subpath.
5. Confirmation that a **Private** signature is the accepted distribution level. If the plugin will be distributed publicly or as a commercial offering, use Grafana's catalog submission and review process instead.
6. A clean release commit with matching `package.json` and Git tag versions.
7. A successful CI run, including the Grafana-version E2E matrix, before producing the final release.

Do not create or transmit the signing token until the responsible owner and approved secret-storage location are known.

## Obtain the Grafana Access Policy token

The person performing these steps must be an administrator of the matching Grafana Cloud organization.

1. Sign in to Grafana Cloud.
2. Open **My Account > Security > Access Policies**.
3. Select **Create access policy**.
4. Set the realm to `digitalrcs` with **all-stacks** access.
5. Add the scope `plugins:write`.
6. Create a token for the policy.
7. Set an expiration date consistent with the organization's security policy.
8. Copy the token once and store it in an approved secret manager. Grafana will not display it again.

The token verifies the publisher's authority to sign a plugin whose ID starts with `digitalrcs-`. Never place the token in source files, documentation, shell history, dashboard JSON, build artifacts, email, or chat.

## Collect the private-signature root URLs

For a private signature, obtain the exact value of `[server] root_url` from each target Grafana administrator. It must represent the URL users actually use to reach Grafana, including a reverse-proxy subpath when one exists.

Examples:

```text
https://grafana.example.internal/
https://observability.example.internal/grafana/
```

If one artifact is approved for multiple instances, provide a comma-separated list when signing. Do not guess internal URLs or substitute a container hostname. A changed root URL requires a new signature and release artifact.

## Manual private signing in WSL or Linux

Grafana's toolchain supports Windows through WSL. Signing in WSL or Linux also avoids a documented Windows path-separator problem.

1. Start from a clean release commit:

   ```bash
   cd /mnt/c/Data/GrafanaCode/digitalrcs-timeoverlay-panel
   git status --short
   ```

2. Install the locked dependencies and validate the release:

   ```bash
   npm ci
   npm run typecheck
   npm run lint
   npm run test:ci
   npm run build
   ```

3. Load the token without placing it directly in shell history:

   ```bash
   read -s -p "Grafana access policy token: " GRAFANA_ACCESS_POLICY_TOKEN
   echo
   export GRAFANA_ACCESS_POLICY_TOKEN
   ```

4. Sign for one exact root URL:

   ```bash
   npm run sign -- --rootUrls "https://grafana.example.internal/"
   ```

   For multiple approved instances:

   ```bash
   npm run sign -- --rootUrls "https://grafana-a.example.internal/,https://grafana-b.example.internal/grafana/"
   ```

5. Confirm that the manifest was generated:

   ```bash
   test -s dist/MANIFEST.txt
   grep -E 'signatureType|signedByOrg|plugin|version' dist/MANIFEST.txt
   ```

6. Remove the token from the current shell when signing is finished:

   ```bash
   unset GRAFANA_ACCESS_POLICY_TOKEN
   ```

`MANIFEST.txt` records the plugin metadata and SHA-256 checksum of every signed file. Do not modify, add, remove, rebuild, or reformat anything in `dist` after signing. Any such change produces a **Modified signature** result.

## Package the signed plugin

The ZIP must contain one top-level directory matching the plugin ID. `plugin.json`, `module.js`, and `MANIFEST.txt` must be directly inside that directory.

```bash
plugin_id=digitalrcs-timeoverlay-panel
version=$(node -p "require('./package.json').version")
package_dir="artifacts/package/${plugin_id}"

rm -rf "${package_dir}"
mkdir -p "${package_dir}"
cp -R dist/. "${package_dir}/"

cd artifacts/package
zip -r "../${plugin_id}-${version}.zip" "${plugin_id}"
cd ../..

sha256sum "artifacts/${plugin_id}-${version}.zip" \
  > "artifacts/${plugin_id}-${version}.zip.sha256"
```

Inspect the package:

```bash
unzip -l "artifacts/${plugin_id}-${version}.zip"
```

Expected minimum layout:

```text
digitalrcs-timeoverlay-panel/
|-- MANIFEST.txt
|-- plugin.json
|-- module.js
|-- README.md
|-- LICENSE
`-- img/
```

Distribute the ZIP and checksum through the approved artifact-transfer channel. Do not distribute the access-policy token.

## Automated signed releases with GitHub Actions

The repository already has a tag-triggered release workflow. To enable signed private releases:

1. In the repository, open **Settings > Secrets and variables > Actions**.
2. Add a repository secret named `GRAFANA_ACCESS_POLICY_TOKEN` containing the Access Policy token.
3. Add a repository secret named `GRAFANA_SIGN_ROOT_URLS` containing the exact comma-separated root URLs. Keeping private hostnames in a secret avoids publishing them in the workflow file.
4. Configure the release job with the permissions and signing inputs below:

   ```yaml
   jobs:
     release:
       permissions:
         id-token: write
         contents: write
         attestations: write
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - uses: grafana/plugin-actions/build-plugin@build-plugin/v1.2.0
           with:
             policy_token: ${{ secrets.GRAFANA_ACCESS_POLICY_TOKEN }}
             sign_root_urls: ${{ secrets.GRAFANA_SIGN_ROOT_URLS }}
             attestation: true
   ```

5. Change the project version through a reviewed pull request. For example:

   ```bash
   npm version --no-git-tag-version 1.0.1
   ```

6. After the version change is merged and CI passes, update local `main`, create the matching tag, and push it:

   ```bash
   git switch main
   git pull --ff-only
   git tag -a v1.0.1 -m "DigitalRCS-TimeOverlay-Panel v1.0.1"
   git push origin v1.0.1
   ```

7. Review the generated draft release. Confirm the release ZIP contains `MANIFEST.txt`, verify the checksum, and retain the build-provenance attestation.
8. Publish or transfer the approved release artifact.

The version in `package.json` and the Git tag must match. Secrets are not available to untrusted pull-request workflows and should only be used in the protected release workflow.

## Public catalog signing route

Do not supply `rootUrls` for a public plugin after Grafana grants a Community or Commercial signature level.

1. Confirm whether the plugin qualifies as Community, Commercial, or Marketplace software under Grafana's current policy.
2. Build, package, and validate the plugin.
3. Sign in to the Grafana Cloud organization as an administrator.
4. Open **Org Settings > My Plugins** and choose **Submit New Plugin**.
5. Provide the release ZIP URL, source URL, SHA-1 value requested by the submission form, testing guidance, and provisioned test environment details.
6. Grafana performs automated validation, code review, and installation testing.
7. After approval and signature-level assignment, sign without `rootUrls` and submit the resulting release through the catalog process.

Grafana reviews each public submission individually. A complete repository and passing validation do not guarantee approval.

## Install and verify the signed artifact

1. Verify the received SHA-256 checksum before extraction.
2. Extract the top-level `digitalrcs-timeoverlay-panel` directory into Grafana's configured plugin directory.
3. Ensure the entire cluster or replica set receives the same unmodified artifact.
4. A correctly signed plugin does not require `allow_loading_unsigned_plugins` for this plugin ID.
5. Restart Grafana.
6. Inspect Grafana logs for `digitalrcs-timeoverlay-panel`, `signature`, `modified`, and `invalid`.
7. In Grafana, open **Administration > Plugins and data > Plugins** and confirm the plugin is reported as **Signed**.
8. Add the panel, query generic time-series data, create a range and note, save, reload, and test the organization's PNG/PDF renderer.

## When re-signing is required

Build and sign a new version whenever any of the following changes:

- JavaScript, metadata, documentation, images, or any other packaged file.
- Plugin version.
- Approved private root URLs.
- Build output or dependencies affecting `dist`.
- Package contents.

Never copy an old `MANIFEST.txt` into a new build. Build first, sign second, package third, and do not mutate the package afterward.

## Troubleshooting

### `Field is required: rootUrls`

For private signing, pass `--rootUrls` and ensure each value exactly matches Grafana's configured `root_url`. Also confirm the Access Policy token belongs to the Grafana Cloud organization matching the `digitalrcs` plugin-ID prefix.

For public signing, this error commonly means Grafana has not yet reviewed the plugin and assigned its public signature level.

### `Modified signature`

- Confirm nothing changed in `dist` after signing.
- Rebuild, sign, and package in that order.
- Prefer WSL or Linux for signing. Grafana documents a Windows issue in which backslashes in `MANIFEST.txt` can cause this status.
- Never manually reuse a manifest from another build.

### `Invalid signature` or plugin not loaded

- Confirm the installed plugin directory contains the exact signed files.
- Confirm the private signature includes the instance's exact `root_url`.
- Confirm every Grafana replica uses the same artifact.
- Inspect server logs for the detailed signature error.
- Re-sign after any root URL or package change.

### Token or organization error

- Confirm the token scope is `plugins:write`.
- Confirm its realm is the matching `digitalrcs` Grafana Cloud organization.
- Confirm the token is not expired or revoked.
- Rotate the token if it may have been exposed; never send it with the plugin package.

## Release approval checklist

- [ ] Distribution route approved: Private, Community, or Commercial.
- [ ] Grafana Cloud organization slug matches `digitalrcs`.
- [ ] Access Policy token has `plugins:write` and is stored securely.
- [ ] Exact private root URLs approved and recorded outside source control.
- [ ] Version change reviewed and Git tag matches `package.json`.
- [ ] Type checking, linting, unit tests, build, compatibility, and E2E checks pass.
- [ ] `dist/MANIFEST.txt` exists and is nonempty.
- [ ] Nothing in `dist` changed after signing.
- [ ] ZIP has the correct top-level plugin directory.
- [ ] SHA-256 checksum generated and independently verified.
- [ ] Target administrator confirms Grafana reports **Signed**.
- [ ] Saved overlays and the production PNG/PDF export route are tested.
- [ ] Token is removed from the signing shell and retained only in approved secret storage.

## Official references

- [Sign a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
- [Plugin signatures and signature levels](https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-sign/)
- [Package a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/package-a-plugin)
- [Automate plugin builds and signing](https://grafana.com/developers/plugin-tools/publish-a-plugin/build-automation)
- [Publish or update a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/publish-a-plugin)
- [Grafana build-plugin action](https://github.com/grafana/plugin-actions/tree/main/build-plugin)
