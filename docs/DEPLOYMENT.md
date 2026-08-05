# Deployment guide

This guide describes how to deploy DigitalRCS-TimeOverlay-Panel to self-hosted Grafana and Grafana Enterprise installations. The plugin ID is:

```text
digitalrcs-timeoverlay-panel
```

The plugin is frontend-only, so the same build artifact works on Windows, Linux, containers, and Kubernetes nodes.

## Install a prebuilt release (no compilation required)

Administrators do not need this source repository, Node.js, npm, or the Grafana plugin SDK to install a published release.

1. Open the repository's [GitHub Releases page](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/releases).
2. Download the versioned plugin ZIP attached to the release, such as `digitalrcs-timeoverlay-panel-1.0.0.zip`. Do not download GitHub's automatically generated **Source code** ZIP or TAR files.
3. Verify the downloaded checksum if the release provides one.
4. Inspect the archive. It must contain a top-level `digitalrcs-timeoverlay-panel` directory with `plugin.json` and `module.js` directly inside it. A production-signed archive also contains `MANIFEST.txt`.
5. Extract or deploy that top-level directory using the Windows, Linux, Docker, or Kubernetes instructions below.
6. Because the published package is expected to be unsigned, add `digitalrcs-timeoverlay-panel` to Grafana's unsigned-plugin allowlist using the platform-specific configuration below, then restart Grafana.

The release ZIP is the compiled plugin. Keep it intact as the approved deployment artifact and install the same version on every Grafana instance. The normal instructions in this guide assume the package does not contain `MANIFEST.txt` and is loaded through Grafana's explicit unsigned-plugin allowlist.

## Allow the unsigned plugin

Grafana blocks unsigned plugins by default. The administrator must explicitly allow this plugin ID in the Grafana configuration:

```ini
[plugins]
allow_loading_unsigned_plugins = digitalrcs-timeoverlay-panel
```

The equivalent environment variable for Docker, Kubernetes, and other environment-driven installations is:

```text
GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=digitalrcs-timeoverlay-panel
```

If other unsigned plugins are already allowed, use a comma-separated list. Grafana logs a warning while an unsigned plugin is loaded. The responsible Grafana and security administrators should approve this exception before deployment.

Unsigned plugins are not supported in Grafana Cloud. This guide's unsigned-package path applies to self-hosted Grafana and Grafana Enterprise instances where administrators control the server configuration.

### Optional alternative: signed private or catalog plugin

Use a Grafana private-plugin signature for an internal deployment, or publish the plugin through the Grafana Plugin Catalog. A Grafana plugin signature is not an X.509 or TLS self-signed certificate.

For a private signature, create a Grafana Access Policy token with `plugins:write`, then run:

```bash
export GRAFANA_ACCESS_POLICY_TOKEN='set-this-in-your-secret-manager'
npm ci
npm run build
npm run sign -- --rootUrls https://grafana.example.internal
```

For more than one permitted Grafana address, provide a comma-separated list to `--rootUrls`. Signing creates `dist/MANIFEST.txt`. Never commit or package the access-policy token itself.

Private signatures are bound to the configured root URLs. Use the exact externally visible Grafana URLs, including any subpath, and repeat signing when the plugin contents or permitted root URLs change.

## Build and package

Use a supported Node.js version from `.nvmrc`:

```bash
npm ci
npm run typecheck
npm run lint
npm run test:ci
npm run build
```

If the deployment requires a signature, sign the plugin now. Package the _contents_ of `dist` under a top-level directory matching the plugin ID:

```bash
plugin_id=digitalrcs-timeoverlay-panel
version=$(node -p "require('./package.json').version")
rm -rf "./artifacts/${plugin_id}"
mkdir -p "./artifacts/${plugin_id}"
cp -R ./dist/. "./artifacts/${plugin_id}/"
cd artifacts
zip -r "${plugin_id}-${version}.zip" "${plugin_id}"
```

The archive must have this layout:

```text
digitalrcs-timeoverlay-panel/
|-- plugin.json
|-- module.js
|-- README.md
|-- LICENSE
|-- MANIFEST.txt          # present when signed
`-- img/
```

GitHub Actions also builds and validates the plugin. A tag such as `v1.0.0` invokes the release workflow.

## Windows service installation

The standard installer normally uses:

```text
C:\Program Files\GrafanaLabs\grafana
```

1. Download and extract the published plugin ZIP as described above. If you are producing a new release rather than installing one, build and sign it first.
2. Copy the extracted plugin directory into Grafana's plugin directory from an elevated PowerShell window:

   ```powershell
   $source = "C:\path\to\extracted\digitalrcs-timeoverlay-panel"
   $destination = "C:\Program Files\GrafanaLabs\grafana\data\plugins\digitalrcs-timeoverlay-panel"

   New-Item -ItemType Directory -Path $destination -Force
   Copy-Item -Path "$source\*" -Destination $destination -Recurse -Force
   ```

3. Edit `conf\custom.ini` as Administrator and set the unsigned-plugin allowlist described above. Copy `sample.ini` to `custom.ini` first if the file does not exist. Never edit `defaults.ini`.
4. Restart Grafana:

   ```powershell
   Restart-Service Grafana
   ```

5. Verify registration:

   ```powershell
   Get-Content "C:\Program Files\GrafanaLabs\grafana\data\log\grafana.log" -Tail 200 |
     Select-String "digitalrcs-timeoverlay-panel|unsigned|signature"
   ```

## Linux or virtual-machine installation

Download and extract the published plugin ZIP as described above. Confirm the configured plugin directory before copying. A common package-installation path is `/var/lib/grafana/plugins`, while the main configuration is commonly `/etc/grafana/grafana.ini`.

```bash
sudo install -d -o grafana -g grafana \
  /var/lib/grafana/plugins/digitalrcs-timeoverlay-panel

sudo cp -R ./digitalrcs-timeoverlay-panel/. \
  /var/lib/grafana/plugins/digitalrcs-timeoverlay-panel/

sudo chown -R grafana:grafana \
  /var/lib/grafana/plugins/digitalrcs-timeoverlay-panel

sudo systemctl restart grafana-server
sudo journalctl -u grafana-server -n 200 --no-pager |
  grep -E 'digitalrcs-timeoverlay-panel|unsigned|signature'
```

Configure the allowlist under `[plugins]` in `grafana.ini` before restarting. Do not assume the paths above when the installation uses custom `paths.plugins` or service arguments.

## Docker image

For controlled deployments, extract the approved published ZIP and bake its top-level plugin directory into an immutable Grafana image:

```dockerfile
FROM grafana/grafana-enterprise:13.1.2

USER root
COPY --chown=grafana:grafana \
  digitalrcs-timeoverlay-panel/ \
  /var/lib/grafana/plugins/digitalrcs-timeoverlay-panel/
USER grafana
```

Build context must contain the packaged `digitalrcs-timeoverlay-panel` directory. The expected unsigned release does not contain `MANIFEST.txt`:

```bash
docker build -t internal/grafana-with-time-overlay:13.1.2 .
```

For the expected unsigned package, add:

```dockerfile
ENV GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=digitalrcs-timeoverlay-panel
```

Do not use floating Grafana tags for controlled releases. Pin and test a specific Grafana version.

## Docker Compose development mount

The repository's generated Compose setup mounts `dist` automatically. A generic equivalent is:

```yaml
services:
  grafana:
    image: grafana/grafana-enterprise:13.1.2
    ports:
      - '3000:3000'
    environment:
      GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: digitalrcs-timeoverlay-panel
    volumes:
      - ./dist:/var/lib/grafana/plugins/digitalrcs-timeoverlay-panel:ro
```

This mount is a development pattern. For a controlled deployment, prefer an immutable image containing the approved release ZIP's extracted plugin directory and the explicit unsigned-plugin allowlist setting.

## Kubernetes and Helm-oriented deployments

Use one of these organization-approved patterns:

1. Build a derived Grafana image containing the approved plugin package and deploy that immutable image.
2. Use a controlled init container to retrieve the approved plugin archive from an authenticated internal artifact store and expand it into a shared plugin volume.
3. Use Grafana's supported preinstall configuration when the ZIP is available from a URL accessible to the Grafana pod.

Example preinstall environment value:

```yaml
env:
  GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS: digitalrcs-timeoverlay-panel
  GF_PLUGINS_PREINSTALL_SYNC: >-
    digitalrcs-timeoverlay-panel@1.0.0@https://artifacts.example.internal/digitalrcs-timeoverlay-panel-1.0.0.zip
```

The artifact URL, credentials, certificate authorities, network policy, persistent storage, and pod security context must follow the target environment's standards. Do not embed access tokens in Helm values committed to source control.

After rollout, confirm that every Grafana replica loads the same plugin version and reports the expected unsigned status. A rolling deployment can temporarily serve different frontend assets if replicas are not updated consistently.

## Verify the deployment

1. Inspect Grafana logs for the plugin ID and signature status.
2. Sign in as a Grafana administrator.
3. Navigate to **Administration > Plugins and data > Plugins**.
4. Confirm **DigitalRCS-TimeOverlay-Panel** is present.
5. Add a panel and select **DigitalRCS-TimeOverlay-Panel** as its visualization.
6. Query data containing a time field and at least one numeric field.
7. Draw a range, add a note, save the dashboard, and reload it.
8. If image/PDF export is required, test the organization's configured Grafana image-renderer service. The renderer must be able to load the same plugin assets and data sources as the Grafana instance.

## Upgrade and rollback

For an upgrade:

1. Download and approve the new published ZIP.
2. Retain the previous ZIP or immutable image.
3. Deploy the new artifact consistently to every replica.
4. Restart or roll Grafana instances.
5. Verify plugin registration, dashboards, saved overlays, and rendering.

For rollback, restore the previous complete plugin directory or image. Do not mix files from two builds in the same plugin directory because a signature manifest covers exact file checksums.

## References

- [Install a Grafana plugin](https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-install/)
- [Grafana plugin signatures](https://grafana.com/docs/grafana/latest/administration/plugin-management/plugin-sign/)
- [Sign a plugin you developed](https://grafana.com/developers/plugin-tools/publish-a-plugin/sign-a-plugin)
- [Package a plugin](https://grafana.com/developers/plugin-tools/publish-a-plugin/package-a-plugin)
- [Configure Grafana](https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/)
