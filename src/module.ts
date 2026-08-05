import { FieldColorModeId, FieldConfigProperty, PanelPlugin } from '@grafana/data';
import { LineInterpolation } from '@grafana/schema';
import { TimeOverlayPanel } from './components/TimeOverlayPanel';
import { TimeOverlayOptions } from './types';

export const plugin = new PanelPlugin<TimeOverlayOptions>(TimeOverlayPanel)
  .useFieldConfig({
    standardOptions: {
      [FieldConfigProperty.Color]: {
        defaultValue: { mode: FieldColorModeId.PaletteClassic },
      },
      [FieldConfigProperty.Unit]: {},
      [FieldConfigProperty.Decimals]: {},
      [FieldConfigProperty.DisplayName]: {},
    },
  })
  .setPanelOptions((builder) =>
    builder
      .addColorPicker({
        path: 'rangeColor',
        name: 'Time range color',
        defaultValue: '#FF9830',
      })
      .addSliderInput({
        path: 'rangeOpacity',
        name: 'Time range opacity',
        description: 'Transparency of the highlighted range background. Text and borders stay opaque.',
        defaultValue: 20,
        settings: {
          min: 0,
          max: 100,
          step: 5,
          ariaLabelForHandle: 'Time range opacity percentage',
        },
      })
      .addColorPicker({
        path: 'noteColor',
        name: 'Note color',
        defaultValue: '#FFDB5C',
      })
      .addSliderInput({
        path: 'noteOpacity',
        name: 'Note opacity',
        description: 'Transparency of the note background. Note text and controls stay opaque.',
        defaultValue: 55,
        settings: {
          min: 0,
          max: 100,
          step: 5,
          ariaLabelForHandle: 'Note opacity percentage',
        },
      })
      .addBooleanSwitch({
        path: 'showPoints',
        name: 'Show points',
        description: 'Draw a marker at every data point. Hover a point to see its timestamp and series values.',
        defaultValue: true,
      })
      .addSliderInput({
        path: 'pointSize',
        name: 'Point size',
        defaultValue: 5,
        settings: {
          min: 1,
          max: 15,
          step: 1,
          ariaLabelForHandle: 'Point size',
        },
      })
      .addRadio({
        path: 'lineInterpolation',
        name: 'Line style',
        description: 'Choose straight segments or smooth curved lines between data points.',
        defaultValue: LineInterpolation.Linear,
        settings: {
          options: [
            { value: LineInterpolation.Linear, label: 'Straight' },
            { value: LineInterpolation.Smooth, label: 'Curved' },
          ],
        },
      })
      .addBooleanSwitch({
        path: 'showLegend',
        name: 'Show legend',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showToolbar',
        name: 'Show overlay toolbar',
        description: 'The toolbar is automatically hidden in Grafana render routes.',
        defaultValue: true,
      })
  );
