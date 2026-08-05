import { DataFrame, dateTimeParse, Field, FieldType } from '@grafana/data';
import { TimeZone } from '@grafana/schema';

const TIME_FIELD_NAMES = new Set(['time', '_time']);
const MISSING_NUMBER_VALUES = new Set(['', '-', 'na', 'n/a', 'null', 'none']);
const NUMBER_PATTERN = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const EPOCH_SECONDS_LIMIT = 100_000_000_000;

const isTimeFieldName = (name: string) => TIME_FIELD_NAMES.has(name.trim().toLowerCase());

const parseEpoch = (value: number): number | null => {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.abs(value) < EPOCH_SECONDS_LIMIT ? value * 1000 : value;
};

const parseTimeValue = (value: unknown, timeZone?: TimeZone): number | null => {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return parseEpoch(value.valueOf());
  }
  if (typeof value === 'number') {
    return parseEpoch(value);
  }

  const text = String(value).trim();
  if (NUMBER_PATTERN.test(text)) {
    return parseEpoch(Number(text));
  }

  try {
    const normalized = text.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const hasExplicitZone = /(?:z|[+-]\d{2}:\d{2})$/i.test(normalized);
    const parsed = hasExplicitZone ? Date.parse(normalized) : dateTimeParse(normalized, { timeZone }).valueOf();

    return Number.isFinite(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const parseNumberValue = (value: unknown): number | null | undefined => {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value).trim();
  if (MISSING_NUMBER_VALUES.has(text.toLowerCase())) {
    return null;
  }

  const normalized = text.replace(/,/g, '');
  if (!NUMBER_PATTERN.test(normalized)) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const convertNumericField = (field: Field): Field => {
  if (field.type === FieldType.number) {
    return field;
  }
  if (field.type !== FieldType.string && field.type !== FieldType.other) {
    return field;
  }

  const values = Array.from(field.values, parseNumberValue);
  if (values.some((value) => value === undefined) || !values.some((value) => typeof value === 'number')) {
    return field;
  }

  return { ...field, type: FieldType.number, values: values as Array<number | null> };
};

const orderFrameByTime = (frame: DataFrame, timeFieldIndex: number): DataFrame => {
  const timeValues = frame.fields[timeFieldIndex].values;
  const rowOrder = Array.from(timeValues, (value, index) => ({ value, index }))
    .filter(
      (row): row is { value: number; index: number } => typeof row.value === 'number' && Number.isFinite(row.value)
    )
    .sort((left, right) => left.value - right.value)
    .map((row) => row.index);

  return {
    ...frame,
    length: rowOrder.length,
    fields: frame.fields.map((field) => ({
      ...field,
      values: rowOrder.map((index) => field.values[index]),
    })),
  };
};

/**
 * Leaves datasource-provided Grafana time-series frames intact. As a convenience for
 * untyped table results, it can also recognize a `time`/`_time` column and numeric
 * string columns without depending on a particular datasource or query model.
 */
export const normalizeTimeSeriesFrames = (frames: DataFrame[], timeZone?: TimeZone): DataFrame[] =>
  frames.map((frame) => {
    const timeFieldIndex = frame.fields.findIndex((field) => field.type === FieldType.time);
    const hasNumericField = frame.fields.some((field) => field.type === FieldType.number);

    // This is already the standard contract used by Grafana visualizations. Preserve
    // the complete frame so labels, links, units, metadata, and datasource-specific
    // field configuration continue to behave exactly as supplied.
    if (timeFieldIndex >= 0 && hasNumericField) {
      return frame;
    }

    const namedTimeFieldIndex = frame.fields.findIndex((field) => isTimeFieldName(field.name));
    const selectedTimeFieldIndex = timeFieldIndex >= 0 ? timeFieldIndex : namedTimeFieldIndex;

    const fields = frame.fields.map((sourceField, index) => {
      const field = { ...sourceField, name: sourceField.name.trim() };
      if (index === selectedTimeFieldIndex) {
        return {
          ...field,
          type: FieldType.time,
          values: Array.from(field.values, (value) =>
            sourceField.type === FieldType.time && typeof value === 'number' ? value : parseTimeValue(value, timeZone)
          ),
        };
      }
      return convertNumericField(field);
    });

    const normalizedFrame = { ...frame, fields };
    return selectedTimeFieldIndex >= 0 ? orderFrameByTime(normalizedFrame, selectedTimeFieldIndex) : normalizedFrame;
  });
