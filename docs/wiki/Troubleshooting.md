# Troubleshooting

## The panel is not listed

- Confirm the plugin directory name matches `digitalrcs-timeoverlay-panel`.
- Confirm `plugin.json` and `module.js` are directly inside that directory.
- For an unsigned package, add the exact plugin ID to `allow_loading_unsigned_plugins` or `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS`.
- Restart Grafana after installing the plugin or changing `plugin.json`.
- Search Grafana logs for `digitalrcs-timeoverlay-panel`, `unsigned`, and `signature`.

## The panel displays no data

1. Switch the Grafana query result to **Table view** and inspect the returned fields.
2. Confirm at least one field is typed as **Time** and one as **Number**.
3. For untyped tables, use a `time` or `_time` column and numeric measurement values.
4. Use Grafana's **Convert field type** transformation if the datasource returned strings.
5. Confirm the dashboard time picker includes the timestamps in the result.

## A CSV datasource returns nothing

- Define the CSV time field in the query schema and set it to **Time**.
- Leave **Ignore unknown fields** disabled for dynamic columns.
- Confirm the CSV datasource can access the configured file or URL from the Grafana server, not only from the user's browser.
- For local development, verify local-file access is explicitly enabled for the CSV plugin.

## Timestamps are shifted

- Prefer timestamps with an explicit `Z` or numeric timezone offset.
- Configure the datasource timezone for timestamps without an offset.
- Confirm seconds-versus-milliseconds epoch units. Grafana transformations normally expect milliseconds; the panel fallback also recognizes common epoch-second values.

## A series is missing or has the wrong color

- Confirm its field is numeric after transformations.
- Check field filters and query transformations.
- Remove stale field-name overrides or update their matchers when dynamic series names change.
- Use a fixed-color field override when a series must always use the same color.

## Zoom or overlays do not behave as expected

- Use **Select** for drag-to-zoom and **Range** for a persistent duration overlay.
- **Zoom out** cannot exceed the original dashboard time range; use **Zoom all** to restore it immediately.
- Select a range before using its edge handles or the delete control.
- Drag a note by its header; edit text in its body and resize it from the lower-right handle.

## Dashboard changes cannot be saved

- Confirm the user has dashboard edit permission.
- Confirm the dashboard is not managed by file provisioning or another external provisioning system.
- Import editable dashboards through the Grafana API or create them through the UI.

## PNG or PDF output omits overlays

- Confirm the renderer uses the same Grafana instance and can load the installed plugin assets.
- Confirm the dashboard was saved after editing overlays.
- Confirm the renderer can reach the datasource and receives the same time range.
- Test the exact production rendering or reporting service; browser screenshots alone do not validate server-side rendering.

## Port 3001 is unavailable

Set another host port before starting Compose:

```powershell
$env:GRAFANA_PORT = '3002'
docker compose up -d
```

The container continues to listen on port 3000 internally.

## Collect diagnostics

```powershell
docker compose ps
docker compose logs --tail 300 grafana
curl.exe -fsS http://localhost:3001/api/health
```

Do not include passwords, API tokens, signing tokens, or sensitive datasource query results in issue reports.
