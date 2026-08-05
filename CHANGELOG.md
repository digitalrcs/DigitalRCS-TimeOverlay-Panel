# Changelog

## 1.0.1

- Replaced the generic Apache license placeholders with the DigitalRCS copyright notice.
- Added packaged catalog screenshots to the plugin metadata.
- Added provenance attestation to unsigned review builds while preserving opt-in signing after Grafana approval.

## 1.0.0

- Established the production identity **DigitalRCS-TimeOverlay-Panel** with plugin ID `digitalrcs-timeoverlay-panel` and official website metadata for [DigitalRCS](https://www.digitalrcs.com).
- Added the separate **DigitalRCS-TimeOverlay-Panel** visualization backed by Grafana's native time-series renderer.
- Added Grafana-style horizontal drag zoom, vertical shift-drag zoom, tooltips, double-click zoom-out, and a visible zoom-out control.
- Added percentage-based zoom-in/zoom-out controls and Zoom all, with zoom-out capped at the original dashboard range.
- Added persistent time-range overlays with duration labels, movement, and edge resizing.
- Added editable, movable, and resizable translucent note overlays.
- Added export-friendly rendering and automatic toolbar hiding on Grafana render routes.
- Added unit and end-to-end test coverage.
- Added Windows, Linux, container, and enterprise deployment documentation.
- Added a provisioned local CSV development data source, a dynamically named sample dashboard, and a converter for Splunk timestamp offsets.
- Added converter support for timezone-less timestamps, whitespace after delimiters, and Windows/Linux time-zone identifiers.
- Added stable per-series palette colors, fixed field-color override support, and independent opacity controls for note and range backgrounds.
- Added configurable point markers with native timestamp/series-value hover tooltips.
- Added straight and smooth curved line interpolation options.
- Fixed note and range color pickers for Grafana named palette colors as well as custom CSS colors.
- Import the development dashboard into Grafana's database so it can be edited and saved from the UI.
- Documented installation from a prebuilt GitHub Release ZIP without requiring source compilation or Node.js tooling.
- Added automatic `time`/`_time` detection and numeric-field conversion for dynamically named CSV and Splunk series.
- Removed the DC1/DC2 restriction from the CSV preparation script; all numeric data-center columns are now preserved.
- Changed new panels to Grafana's ordered Classic palette so dynamically discovered series start with distinct colors.
- Preserved valid typed Grafana data frames unchanged for datasource-independent compatibility, including arbitrary time-field names, multiple query frames, labels, units, links, and metadata.
