# Deployment

Administrators can install a published release without Node.js, npm, or source compilation. Download the versioned plugin ZIP, extract its top-level `digitalrcs-timeoverlay-panel` directory into Grafana's plugin directory, configure the unsigned-plugin allowlist only when applicable and approved, and restart Grafana. A valid signed package containing `MANIFEST.txt` is preferred for controlled production deployment.

The complete versioned guide covers:

- Prebuilt signed or approved unsigned releases.
- Optional private signing.
- Windows services.
- Linux and virtual machines.
- Docker and Docker Compose.
- Kubernetes and Helm-oriented deployments.
- Verification, upgrades, and rollback.

See the repository's [complete deployment guide](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/blob/main/docs/DEPLOYMENT.md).

For signing prerequisites and step-by-step procedures, see [Plugin signing](Plugin-Signing).

Plugin ID:

```text
digitalrcs-timeoverlay-panel
```

Unsigned-plugin environment setting:

```text
GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=digitalrcs-timeoverlay-panel
```

Unsigned installation requires self-hosted Grafana or Grafana Enterprise where administrators control configuration. Grafana Cloud requires a catalog-published plugin.
