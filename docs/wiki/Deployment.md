# Deployment

Administrators can install a published release without Node.js, npm, or source compilation. Download the versioned plugin ZIP, extract its top-level `digitalrcs-timeoverlay-panel` directory into Grafana's plugin directory, configure the unsigned-plugin allowlist when applicable, and restart Grafana.

The complete versioned guide covers:

- Prebuilt unsigned releases.
- Optional private signing.
- Windows services.
- Linux and virtual machines.
- Docker and Docker Compose.
- Kubernetes and Helm-oriented deployments.
- Verification, upgrades, and rollback.

See the repository's [complete deployment guide](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/blob/main/docs/DEPLOYMENT.md).

Plugin ID:

```text
digitalrcs-timeoverlay-panel
```

Unsigned-plugin environment setting:

```text
GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=digitalrcs-timeoverlay-panel
```

Unsigned installation requires self-hosted Grafana or Grafana Enterprise where administrators control configuration. Grafana Cloud requires a catalog-published plugin.
