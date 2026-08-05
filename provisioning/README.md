For more information see [Provision dashboards and data sources](https://grafana.com/tutorials/provision-dashboards-and-data-sources/)

# Local CSV sample

The development dashboard provisions a sample CSV datasource from
`/etc/grafana/provisioning/data/datasource-grafana.csv`. The untouched source
is retained as `datasource.csv`. Splunk exports use offsets such as `-0400`,
while the CSV data-source parser expects RFC-3339 offsets such as `-04:00`.
The Grafana-ready copy changes only that offset format. The query maps `_time`
to a Grafana Time field and leaves **Ignore unknown** off; the panel then
detects every remaining numeric column, including dynamically changing data
series names.

Prepare a replacement Splunk export with:

```powershell
.\scripts\prepare-csv.ps1 -InputPath C:\path\to\datasource.csv
```

Timezone-less values such as `2026-08-01 20:00:00` default to
`America/New_York`. Override this when needed, for example:

```powershell
.\scripts\prepare-csv.ps1 -InputPath C:\path\to\datasource.csv -TimeZoneId UTC
```

Local-file access is intentionally enabled only in `.config/grafana.ini` and
mounted by the development Docker configuration. For a shared or production deployment, store historical data
in an approved database or serve the CSV from an approved internal HTTPS
endpoint instead of enabling arbitrary local-file access.

## Editing the example dashboard

The development Docker setup imports `dashboard.json` through Grafana's HTTP
API instead of file-provisioning it. The resulting dashboard is stored in
Grafana's database and can be edited and saved normally in the UI. The importer
uses `overwrite: false`, so restarting the Compose project does not replace UI
changes to an existing dashboard. The Compose project bind-mounts Grafana's
writable database, installed plugins, rendered files, and other runtime state
from `.local/grafana-data` on the host to `/var/lib/grafana` in the container.
This preserves Grafana state across container recreation while keeping the files
directly accessible from Windows. The directory is intentionally ignored by Git
because it can contain local users, settings, and other environment-specific data.

The editable host paths are:

- `dist` for the compiled DigitalRCS-TimeOverlay-Panel plugin mounted at
  `/var/lib/grafana/plugins/digitalrcs-timeoverlay-panel`.
- `provisioning` for local datasource and provisioning files mounted at
  `/etc/grafana/provisioning`.
- `.local/grafana-data` for Grafana's writable application state mounted at
  `/var/lib/grafana`.

The development container publishes Grafana at `http://localhost:3001` by
default because host port 3000 may already be occupied. Set `GRAFANA_PORT` before
running Compose if another host port is required; the container still listens on
port 3000 internally.

After changing plugin source, run `npm run dev` for watch mode or `npm run build`
for a production build. Grafana reads the resulting files from the host-mounted
`dist` directory.

If an administrator intentionally wants dashboards managed as code, they can
configure Grafana file provisioning instead. File-provisioned dashboards can
be restricted to reviewed JSON changes; they also have different save behavior
from ordinary database-backed dashboards.
