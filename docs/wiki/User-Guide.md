# User guide

## Add the panel

1. Open a Grafana dashboard and select **Add visualization**.
2. Choose the datasource and configure its query.
3. Select **DigitalRCS-TimeOverlay-Panel** from the visualization picker.
4. Confirm the query returns a Grafana time field and at least one numeric field.
5. Save the dashboard.

Series names are taken from the numeric fields returned by the query. They do not need to follow a fixed naming convention. Names such as `USTX01`, `UXVA01`, or any other dynamically returned field are supported.

## Toolbar controls

| Control      | Behavior                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------ |
| **Select**   | Drag horizontally over the plot to zoom to the selected time interval.                     |
| **Zoom in**  | Reduces the displayed time window by 50 percent around its center.                         |
| **Zoom out** | Expands the displayed window by 50 percent without exceeding the original dashboard range. |
| **Zoom all** | Restores the original dashboard time range.                                                |
| **Range**    | Enables creation of a persistent highlighted duration range.                               |
| **Note**     | Adds an editable note over the plot.                                                       |
| **Delete**   | Removes the currently selected range or note.                                              |

The toolbar is automatically omitted from Grafana render routes used for image and report generation.

## Measure a duration

1. Select **Range**.
2. Drag from the desired start time to the desired end time.
3. The highlighted overlay displays the elapsed duration.
4. Select and drag the overlay to move it without changing its length.
5. Select the overlay and drag either edge handle to adjust its start or end.
6. Save the dashboard to persist it.

Duration labels automatically use milliseconds, seconds, minutes, hours, or days as appropriate.

## Add and edit a note

1. Select **Note**.
2. Click in the note text area and enter the desired text.
3. Drag the note by its header to reposition it.
4. Drag its lower-right handle to resize it.
5. Save the dashboard to persist it.

Notes use positions and sizes relative to the plot area, helping them remain aligned when the panel is resized or rendered.

## Inspect values

When point markers are enabled, hover over a point to display its timestamp and the values for the visible series at that time. The legend uses each numeric field's Grafana display name.

## Save, share, and export

- Ranges, notes, and appearance settings are stored in the panel options inside the dashboard JSON.
- The dashboard must be saved after adding, moving, resizing, editing, or deleting an overlay.
- PNG and PDF output requires a correctly configured Grafana image-renderer or reporting service.
- The renderer must be able to load the same plugin version and reach the same datasources as the Grafana instance.
- Always test the organization's actual export route before relying on it for reporting.
