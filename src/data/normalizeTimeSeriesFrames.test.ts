import { FieldType, toDataFrame } from '@grafana/data';
import { normalizeTimeSeriesFrames } from './normalizeTimeSeriesFrames';

describe('normalizeTimeSeriesFrames', () => {
  it('detects _time and arbitrary numeric CSV columns', () => {
    const source = toDataFrame({
      fields: [
        { name: ' _Time ', type: FieldType.string, values: ['2026-08-01T20:00:00-0400', '2026-08-02T20:00:00-0400'] },
        { name: 'USTX01', type: FieldType.string, values: ['123,456', '234567'] },
        { name: 'UXVA01', type: FieldType.string, values: ['543222', 'N/A'] },
      ],
    });

    const [frame] = normalizeTimeSeriesFrames([source], 'America/New_York');

    expect(frame.fields.map((field) => [field.name, field.type])).toEqual([
      ['_Time', FieldType.time],
      ['USTX01', FieldType.number],
      ['UXVA01', FieldType.number],
    ]);
    expect(frame.fields[1].values).toEqual([123456, 234567]);
    expect(frame.fields[2].values).toEqual([543222, null]);
  });

  it('parses timezone-less CSV timestamps in the selected Grafana timezone', () => {
    const source = toDataFrame({
      fields: [
        { name: 'time', type: FieldType.string, values: ['2026-08-01 20:00:00'] },
        { name: 'USAZ01', type: FieldType.string, values: ['10.5'] },
      ],
    });

    const [frame] = normalizeTimeSeriesFrames([source], 'America/New_York');

    expect(frame.fields[0].values).toEqual([Date.UTC(2026, 7, 2, 0, 0, 0)]);
    expect(frame.fields[1].values).toEqual([10.5]);
  });

  it('accepts Splunk epoch seconds and orders rows by time', () => {
    const source = toDataFrame({
      fields: [
        { name: '_time', type: FieldType.number, values: [2_000_000_001, 2_000_000_000] },
        { name: 'USTX01', type: FieldType.number, values: [20, 10] },
      ],
    });

    const [frame] = normalizeTimeSeriesFrames([source]);

    expect(frame.fields[0].type).toBe(FieldType.time);
    expect(frame.fields[0].values).toEqual([2_000_000_000_000, 2_000_000_001_000]);
    expect(frame.fields[1].values).toEqual([10, 20]);
  });

  it('does not convert label columns or mutate source field configuration', () => {
    const source = toDataFrame({
      fields: [
        { name: 'time', type: FieldType.time, values: [1_000] },
        { name: 'site', type: FieldType.string, values: ['primary'] },
        {
          name: 'USTX01',
          type: FieldType.string,
          values: ['42'],
          config: { color: { mode: 'fixed', fixedColor: 'red' } },
        },
      ],
    });

    const [frame] = normalizeTimeSeriesFrames([source]);

    expect(frame.fields[1].type).toBe(FieldType.string);
    expect(frame.fields[0].values).toEqual([1_000]);
    expect(frame.fields[2].config.color).toEqual({ mode: 'fixed', fixedColor: 'red' });
    expect(source.fields[2].type).toBe(FieldType.string);
  });

  it('passes a standard typed Grafana frame through unchanged', () => {
    const source = toDataFrame({
      name: 'query A',
      refId: 'A',
      meta: { preferredVisualisationType: 'graph' },
      fields: [
        { name: 'Timestamp', type: FieldType.time, values: [1_000, 2_000] },
        {
          name: 'Value',
          type: FieldType.number,
          values: [10, 20],
          labels: { instance: 'server-1' },
          config: { unit: 'percent', links: [] },
        },
        { name: 'numeric_identifier', type: FieldType.string, values: ['001', '002'] },
      ],
    });

    const [frame] = normalizeTimeSeriesFrames([source]);

    expect(frame).toBe(source);
    expect(frame.fields[1].labels).toEqual({ instance: 'server-1' });
    expect(frame.fields[2].type).toBe(FieldType.string);
  });

  it('supports multiple independently typed datasource frames', () => {
    const frames = ['server-a', 'server-b'].map((instance, index) =>
      toDataFrame({
        refId: String.fromCharCode(65 + index),
        fields: [
          { name: 'observed_at', type: FieldType.time, values: [1_000, 2_000] },
          { name: 'requests', type: FieldType.number, values: [index + 1, index + 2], labels: { instance } },
        ],
      })
    );

    const normalized = normalizeTimeSeriesFrames(frames);

    expect(normalized).toEqual(frames);
    expect(normalized[0]).toBe(frames[0]);
    expect(normalized[1]).toBe(frames[1]);
  });
});
