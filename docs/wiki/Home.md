# DigitalRCS-TimeOverlay-Panel

DigitalRCS-TimeOverlay-Panel is a Grafana panel visualization that combines Grafana-compatible time-series rendering with persistent duration selections and movable notes. Overlays are stored with the dashboard and remain visible in supported PNG and PDF rendering.

![DigitalRCS-TimeOverlay-Panel](https://raw.githubusercontent.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/main/docs/images/digitalrcs-time-overlay-panel.jpg)

## Documentation

- [User guide](User-Guide) - Add the panel, navigate the timeline, create ranges, and add notes.
- [Data sources](Data-Sources) - Required Grafana data shapes, CSV, Splunk, SQL, and dynamic series.
- [Panel configuration](Panel-Configuration) - Colors, opacity, points, line style, legend, and toolbar settings.
- [Deployment](Deployment) - Prebuilt installation and production deployment guidance.
- [Developer guide](Developer-Guide) - Architecture, local development, tests, packaging, and releases.
- [Troubleshooting](Troubleshooting) - Common installation, data, display, save, and export problems.

## Project links

- [Source repository](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel)
- [Releases](https://github.com/digitalrcs/DigitalRCS-TimeOverlay-Panel/releases)
- [DigitalRCS](https://www.digitalrcs.com)

## Compatibility

- Grafana 12.3.0 or later.
- Self-hosted Grafana and Grafana Enterprise support unsigned installation when the plugin ID is explicitly allowed.
- Grafana Cloud requires a catalog-published plugin; it does not support the unsigned installation path.
- Any normal Grafana datasource can be used when its result includes a typed time field and one or more numeric fields.
