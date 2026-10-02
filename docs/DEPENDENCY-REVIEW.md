# Dependency review for 1.2.0

Reviewed October 2, 2026. The full npm audit decreased from 15 affected packages (six high, eight moderate, one low) to four moderate, zero high, zero critical, and zero low.

## Remediation

Compatible lockfile updates include brace-expansion, DOMPurify, ip-address, and qs. Two scoped overrides address dependencies whose parents still constrain the older release:

- `get-uri` uses `basic-ftp` 6.2.1, fixing GHSA-c475-qrg2-pj4r. The signing package stays on 3.3.3; it is not downgraded. The Client methods consumed by get-uri (access, lastMod, list, downloadTo, close) remain available. The release signing operation validates the actual signing path; FTP proxy retrieval is not used by this project.
- `@grafana/data` uses Moment 2.31.0, fixing GHSA-4p3w-j4w9-5jqw without changing Grafana's SDK version or supported host range.

## Remaining upstream findings

`react-router` 6.x, `react-router-dom-v5-compat`, `@grafana/ui`, and `@grafana/runtime` remain reported as four affected packages through the same Router dependency chain. The advisories are GHSA-wrjc-x8rr-h8h6 (navigation open redirect) and GHSA-337j-9hxr-rhxg (SSR error hydration). Their published fixed version is React Router 7.18.0. Forcing Router 7 underneath Grafana's version-6 compatibility package is not a supported remediation.

These packages are installed for development against Grafana's SDK. The official webpack configuration externalizes `@grafana/ui`, `@grafana/runtime`, `@grafana/data`, and `react-router`. The production source map is checked to confirm no React Router implementation is bundled. The plugin does not implement routing, SSR, or error hydration and does not ship node_modules in its ZIP.

This is a distribution-scope assessment, not a claim that the full source dependency audit is clean or that the host Grafana is unaffected. Grafana supplies its own runtime libraries; their security lifecycle belongs to the host Grafana installation. We disclose the remaining upstream findings for Grafana's review and retain them in the audit. No audit entries, advisory identifiers, or validator checks are suppressed.

## Validation

Run `npm audit`, typecheck, lint, unit tests, production build, and Docker browser regressions after dependency changes. Validate the exact signed release archive and source commit before catalog submission. A signature verifies integrity and publisher identity; it does not itself certify the dependency assessment.
