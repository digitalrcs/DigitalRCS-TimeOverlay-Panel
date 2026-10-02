# Panel configuration


## Independent zoom (1.2.0)

In the panel editor, set **Zoom behavior**:

- **This panel only** (default): drag to zoom or use the zoom buttons without changing the dashboard time picker or other panels. Zoom out is capped at the dashboard range; **Zoom all** resets to that range.
- **Entire dashboard**: retains the previous behavior, changing Grafana's shared time range and refreshing the affected panels.

Panel-only zoom uses data already loaded; it does not request finer-resolution samples. The viewport is temporary and resets when the dashboard time range changes, including a moving relative range on refresh, when the mode changes, or when the panel reloads. A panel time override, if configured, supplies the reset bounds for that panel. Existing saved panels without a zoom setting now use panel-only zoom; select Entire dashboard to retain the old behavior.

Range overlays keep their timestamps and durations while the visible portion is clipped to the zoomed window. Notes retain their position within the panel. Save the dashboard to persist the zoom behavior setting and overlays; the temporary zoom window is not saved or included in a separately rendered report.

Options are available in the Grafana panel editor.

| Option                   |   Default | Description                                                                                             |
| ------------------------ | --------: | ------------------------------------------------------------------------------------------------------- |
| **Time range color**     | `#FF9830` | Background color for highlighted duration ranges. Grafana named colors and custom colors are supported. |
| **Time range opacity**   |       20% | Range background opacity from 0 to 100 percent in 5 percent steps. Text and borders remain opaque.      |
| **Note color**           | `#FFDB5C` | Background color for notes.                                                                             |
| **Note opacity**         |       55% | Note background opacity from 0 to 100 percent in 5 percent steps. Text and controls remain opaque.      |
| **Show points**          |        On | Displays a marker for every data point and enables precise hover targets.                               |
| **Point size**           |         5 | Marker size from 1 to 15.                                                                               |
| **Line style**           |  Straight | Uses straight segments or smooth curved interpolation.                                                  |
| **Show legend**          |        On | Shows the Grafana series legend below the plot.                                                         |
| **Show overlay toolbar** |        On | Shows interactive overlay controls. It is automatically hidden during render-route exports.             |

## Per-series configuration

The panel supports Grafana's standard field settings for color, unit, decimals, and display name. Configure individual series through field overrides:

1. Edit the panel.
2. Open **Overrides**.
3. Add an override matching a field name or regular expression.
4. Add the desired color, display name, unit, decimals, or other supported property.

Series colors are independent of thresholds. The default Classic palette assigns colors to discovered numeric fields, while fixed-color overrides keep important series consistent between dashboards.

## Persistence model

Ranges and notes are saved in the dashboard's panel options. Their timestamps, text, normalized positions, and dimensions are part of dashboard JSON. Dashboard permissions and normal Grafana save/version-history behavior therefore apply to overlay changes.

Avoid file-provisioning dashboards that users are expected to edit. Import editable examples through Grafana's dashboard API or create them in the UI.
