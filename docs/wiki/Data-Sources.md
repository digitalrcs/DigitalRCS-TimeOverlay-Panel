# Data sources and queries

The panel is datasource-independent. It consumes the standard Grafana data frames delivered to panel plugins and does not contain datasource-specific query logic.

## Preferred data contract

A query should return:

- At least one field with Grafana type **Time**.
- At least one field with Grafana type **Number**.
- Optional string or label fields used by Grafana to identify series.

The time field can have any name when the datasource correctly marks it as a Grafana time field. Every numeric field becomes a plotted series, and the field name or display name becomes its legend label.

Example wide result:

```text
_time                USTX01  UXVA01
2026-08-01 20:00:00  123456  543222
2026-08-01 21:00:00  234567  654333
```

The panel also accepts multiple independently typed frames, which is common for Prometheus-style and other metric queries. Datasource-provided labels, units, links, metadata, and field configuration are preserved.

## Untyped table fallback

For table-like results that are not fully typed, the panel can:

- Recognize a column named `time` or `_time`, ignoring case and surrounding spaces.
- Parse common date strings, timezone offsets, and numeric epoch values.
- Convert numeric-looking string columns into numeric series.
- Preserve nonnumeric string columns as strings.
- Sort converted rows chronologically and omit rows with invalid time values.

This fallback is a convenience, not a replacement for correct datasource query configuration. Prefer typed Grafana fields whenever the datasource supports them.

## CSV

Selecting a CSV datasource alone may not define the returned schema. In the query editor:

1. Add the CSV time column under **Fields** and set its type to **Time**.
2. Leave **Ignore unknown fields** disabled when data-series column names can change.
3. Optionally declare known data columns as **Number**.
4. Set the timezone that applies to timestamps without an explicit offset.

The development helper `scripts/prepare-csv.ps1` accepts `time` or `_time` followed by one or more dynamically named numeric columns.

## Splunk

Splunk normally returns `_time` plus result fields. If the datasource marks `_time` as Time and measurements as Number, no special panel configuration is required. Splunk epoch seconds and common exported timestamp strings are also supported by the fallback converter.

## SQL and other table datasources

Alias or convert the timestamp column to Grafana type **Time** and measurement columns to **Number**. Keep identifier or category columns as strings. If necessary, use Grafana's **Convert field type**, **Organize fields**, or **Prepare time series** transformations before the visualization.

## Dynamic field names and colors

No data-center names are hardcoded. New numeric fields returned by a query are discovered automatically. Use Grafana field overrides with **Fields with name** or a regular-expression matcher to assign stable per-series colors, units, decimals, or display names.
