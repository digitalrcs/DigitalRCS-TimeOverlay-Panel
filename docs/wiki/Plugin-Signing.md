# Plugin signing

Grafana verifies plugin authenticity through a signed `MANIFEST.txt`. This is not an X.509, TLS, Authenticode, or self-signed certificate.

For a controlled internal installation, the likely route is a **Private** Grafana plugin signature bound to the exact approved Grafana `root_url` values. Community and Commercial signatures require Grafana catalog review.

The project is technically prepared for signing: it has a valid plugin ID, production build, `@grafana/sign-plugin`, an `npm run sign` command, and a release workflow. The remaining prerequisites are a matching `digitalrcs` Grafana Cloud organization, administrator access, a `plugins:write` Access Policy token, approved target root URLs, and confirmation of the correct distribution level.

See the repository's [complete offline-ready signing guide](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/blob/main/docs/PLUGIN-SIGNING.md) for manual WSL/Linux signing, automated releases, packaging, verification, troubleshooting, and the release checklist.

Private signing command:

```bash
npm ci
npm run build
npm run sign -- --rootUrls "https://grafana.example.internal/"
```

Signing creates `dist/MANIFEST.txt`. Do not change any packaged file after signing. Any content or root URL change requires rebuilding and re-signing.
