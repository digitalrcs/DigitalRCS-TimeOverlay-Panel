import { FieldType, toDataFrame } from '@grafana/data';
import { LineInterpolation, VisibilityMode } from '@grafana/schema';
import { applySeriesDisplayOptions, calculateZoomRange, formatDuration } from './TimeOverlayPanel';

describe('formatDuration', () => {
  it.each([
    [250, '250ms'],
    [1_500, '1.5s'],
    [65_000, '1m 5s'],
    [3_665_000, '1h 1m 5s'],
    [90_061_000, '1d 1h 1m'],
  ])('formats %i milliseconds as %s', (milliseconds, expected) => {
    expect(formatDuration(milliseconds)).toBe(expected);
  });
});

describe('calculateZoomRange', () => {
  const fullRange = { from: 0, to: 1_000 };

  it('zooms in around the center by 50 percent', () => {
    expect(calculateZoomRange(fullRange, 0.5, fullRange)).toEqual({ from: 250, to: 750 });
  });

  it('zooms out around the center without exceeding the original range', () => {
    expect(calculateZoomRange({ from: 250, to: 750 }, 1.5, fullRange)).toEqual({ from: 125, to: 875 });
  });

  it('keeps the expanded range inside an off-center original range', () => {
    expect(calculateZoomRange({ from: 0, to: 300 }, 1.5, fullRange)).toEqual({ from: 0, to: 450 });
  });

  it('caps repeated zoom-out at the original range', () => {
    expect(calculateZoomRange({ from: 0, to: 800 }, 1.5, fullRange)).toEqual(fullRange);
  });
});

describe('applySeriesDisplayOptions', () => {
  const frame = toDataFrame({
    fields: [
      { name: '_Time', type: FieldType.time, values: [1, 2] },
      {
        name: 'DC1',
        type: FieldType.number,
        values: [10, 20],
        config: { color: { mode: 'fixed', fixedColor: 'red' }, custom: { lineWidth: 3 } },
      },
    ],
  });

  it('adds points and curved interpolation without replacing existing field settings', () => {
    const [styled] = applySeriesDisplayOptions([frame], {
      showPoints: true,
      pointSize: 7,
      lineInterpolation: LineInterpolation.Smooth,
    });
    const numericField = styled.fields[1];

    expect(numericField.config.color).toEqual({ mode: 'fixed', fixedColor: 'red' });
    expect(numericField.config.custom).toMatchObject({
      lineWidth: 3,
      showPoints: VisibilityMode.Always,
      pointSize: 7,
      lineInterpolation: LineInterpolation.Smooth,
    });
    expect(frame.fields[1].config.custom).toEqual({ lineWidth: 3 });
  });

  it('can hide points and clamps their configured size', () => {
    const [styled] = applySeriesDisplayOptions([frame], {
      showPoints: false,
      pointSize: 99,
      lineInterpolation: LineInterpolation.Linear,
    });

    expect(styled.fields[1].config.custom).toMatchObject({
      showPoints: VisibilityMode.Never,
      pointSize: 15,
      lineInterpolation: LineInterpolation.Linear,
    });
  });
});
