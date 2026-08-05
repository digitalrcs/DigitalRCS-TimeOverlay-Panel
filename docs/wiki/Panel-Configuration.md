# Panel configuration

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
