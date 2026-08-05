import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { css, cx } from '@emotion/css';
import { colorManipulator, DataFrame, FieldType, GrafanaTheme2, PanelProps } from '@grafana/data';
import { PanelDataErrorView } from '@grafana/runtime';
import { LegendDisplayMode, LineInterpolation, SortOrder, TooltipDisplayMode, VisibilityMode } from '@grafana/schema';
import { Icon, TimeSeries, TooltipPlugin, UPlotConfigBuilder, ZoomPlugin, useStyles2, useTheme2 } from '@grafana/ui';
import type uPlot from 'uplot';
import { normalizeTimeSeriesFrames } from '../data/normalizeTimeSeriesFrames';
import { NoteOverlay, TimeOverlayOptions, TimeRangeOverlay } from '../types';

interface Props extends PanelProps<TimeOverlayOptions> {}

type Tool = 'zoom' | 'range';
type Selection = { kind: 'range' | 'note'; id: string } | undefined;
type Interaction =
  | { kind: 'create-range'; start: number; current: number }
  | { kind: 'move-range'; id: string; pointerStart: number; from: number; to: number }
  | { kind: 'resize-range'; id: string; edge: 'from' | 'to' }
  | { kind: 'move-note'; id: string; clientX: number; clientY: number; note: NoteOverlay }
  | { kind: 'resize-note'; id: string; clientX: number; clientY: number; note: NoteOverlay };

interface PlotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface NumericTimeRange {
  from: number;
  to: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const applySeriesDisplayOptions = (
  frames: DataFrame[],
  options: Pick<TimeOverlayOptions, 'showPoints' | 'pointSize' | 'lineInterpolation'>
): DataFrame[] =>
  frames.map((frame) => ({
    ...frame,
    fields: frame.fields.map((field) =>
      field.type === FieldType.number
        ? {
            ...field,
            config: {
              ...field.config,
              custom: {
                ...field.config.custom,
                showPoints: options.showPoints === false ? VisibilityMode.Never : VisibilityMode.Always,
                pointSize: clamp(options.pointSize ?? 5, 1, 15),
                lineInterpolation: options.lineInterpolation ?? LineInterpolation.Linear,
              },
            },
          }
        : field
    ),
  }));

export const calculateZoomRange = (
  current: NumericTimeRange,
  scale: number,
  bounds?: NumericTimeRange
): NumericTimeRange => {
  const currentWidth = Math.max(1, current.to - current.from);
  const center = current.from + currentWidth / 2;
  const requestedWidth = Math.max(1, currentWidth * scale);

  if (!bounds) {
    return {
      from: Math.round(center - requestedWidth / 2),
      to: Math.round(center + requestedWidth / 2),
    };
  }

  const boundsWidth = Math.max(1, bounds.to - bounds.from);
  if (requestedWidth >= boundsWidth) {
    return { ...bounds };
  }

  let from = center - requestedWidth / 2;
  let to = center + requestedWidth / 2;
  if (from < bounds.from) {
    to += bounds.from - from;
    from = bounds.from;
  }
  if (to > bounds.to) {
    from -= to - bounds.to;
    to = bounds.to;
  }
  return { from: Math.round(from), to: Math.round(to) };
};

export const formatDuration = (milliseconds: number): string => {
  let remaining = Math.max(0, Math.round(milliseconds));
  const days = Math.floor(remaining / 86_400_000);
  remaining %= 86_400_000;
  const hours = Math.floor(remaining / 3_600_000);
  remaining %= 3_600_000;
  const minutes = Math.floor(remaining / 60_000);
  remaining %= 60_000;
  const seconds = Math.floor(remaining / 1000);
  const millis = remaining % 1000;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  if (seconds > 0) {
    return `${seconds}.${Math.floor(millis / 100)}s`;
  }
  return `${millis}ms`;
};

const PlotBridge = ({
  config,
  rootRef,
  onPlotRect,
}: {
  config: UPlotConfigBuilder;
  rootRef: React.RefObject<HTMLDivElement>;
  onPlotRect: (rect: PlotRect) => void;
}) => {
  useLayoutEffect(() => {
    const update = (plot: uPlot) => {
      const root = rootRef.current?.getBoundingClientRect();
      const over = plot.over.getBoundingClientRect();
      if (root && over.width > 0 && over.height > 0) {
        onPlotRect({ left: over.left - root.left, top: over.top - root.top, width: over.width, height: over.height });
      }
    };
    config.addHook('ready', update);
    config.addHook('setSize', update);
    config.addHook('syncRect', update);
  }, [config, onPlotRect, rootRef]);
  return null;
};

const getStyles = (theme: GrafanaTheme2) => ({
  root: css`
    position: relative;
    overflow: hidden;
    color: ${theme.colors.text.primary};
    font-family: ${theme.typography.fontFamily};
    user-select: none;
  `,
  chart: css`
    position: absolute;
    inset: 0;
  `,
  toolbar: css`
    position: absolute;
    z-index: 20;
    top: 4px;
    left: 60px;
    display: flex;
    gap: 4px;
    padding: 3px;
    border: 1px solid ${theme.colors.border.medium};
    border-radius: 4px;
    background: ${theme.colors.background.primary};
    box-shadow: ${theme.shadows.z1};

    @media print {
      display: none;
    }
  `,
  toolButton: css`
    display: inline-flex;
    align-items: center;
    gap: 5px;
    height: 26px;
    padding: 0 8px;
    border: 0;
    border-radius: 3px;
    color: ${theme.colors.text.secondary};
    background: transparent;
    cursor: pointer;
    font-size: ${theme.typography.bodySmall.fontSize};

    &:hover,
    &:focus-visible {
      color: ${theme.colors.text.primary};
      background: ${theme.colors.action.hover};
      outline: none;
    }
  `,
  compactToolButton: css`
    justify-content: center;
    width: 30px;
    padding: 0;
  `,
  activeTool: css`
    color: #fff;
    background: ${theme.colors.primary.main};

    &:hover {
      color: #fff;
      background: ${theme.colors.primary.shade};
    }
  `,
  plot: css`
    position: absolute;
    z-index: 10;
    overflow: hidden;
    pointer-events: none;
    touch-action: none;
  `,
  drawingPlot: css`
    cursor: crosshair;
    pointer-events: auto;
  `,
  range: css`
    position: absolute;
    top: 0;
    bottom: 0;
    min-width: 2px;
    border-right: 1px solid ${theme.colors.warning.main};
    border-left: 1px solid ${theme.colors.warning.main};
    cursor: grab;
    pointer-events: auto;
    touch-action: none;
  `,
  selected: css`
    outline: 2px solid ${theme.colors.primary.main};
    outline-offset: -2px;
  `,
  duration: css`
    position: absolute;
    bottom: 8px;
    left: 50%;
    max-width: calc(100% - 8px);
    padding: 3px 7px;
    overflow: hidden;
    border-radius: 3px;
    color: ${theme.colors.text.primary};
    background: ${theme.colors.background.primary};
    box-shadow: ${theme.shadows.z1};
    font-size: 12px;
    font-weight: ${theme.typography.fontWeightMedium};
    line-height: 18px;
    text-overflow: ellipsis;
    white-space: nowrap;
    transform: translateX(-50%);
  `,
  handle: css`
    position: absolute;
    z-index: 2;
    top: 0;
    bottom: 0;
    width: 9px;
    cursor: ew-resize;
  `,
  note: css`
    position: absolute;
    min-width: 90px;
    min-height: 54px;
    overflow: hidden;
    border: 1px solid rgba(120, 100, 0, 0.55);
    border-radius: 4px;
    box-shadow: ${theme.shadows.z1};
    pointer-events: auto;
    touch-action: none;
  `,
  noteHeader: css`
    height: 20px;
    padding: 2px 24px 2px 7px;
    color: rgba(20, 20, 20, 0.72);
    cursor: grab;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
  `,
  noteText: css`
    display: block;
    width: 100%;
    height: calc(100% - 20px);
    padding: 2px 7px 7px;
    resize: none;
    overflow: hidden;
    border: 0;
    outline: 0;
    color: rgba(20, 20, 20, 0.92);
    background: transparent;
    font: inherit;
    font-size: 12px;
    line-height: 1.35;
    user-select: text;
  `,
  resizeHandle: css`
    position: absolute;
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;
    background: linear-gradient(
      135deg,
      transparent 45%,
      rgba(20, 20, 20, 0.55) 46%,
      rgba(20, 20, 20, 0.55) 55%,
      transparent 56%
    );
  `,
});

export const TimeOverlayPanel: React.FC<Props> = ({
  options,
  data,
  width,
  height,
  fieldConfig,
  id,
  timeRange,
  timeZone,
  onChangeTimeRange,
  onOptionsChange,
}) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const rootRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<Interaction>();
  const baselineRangeRef = useRef<NumericTimeRange>({
    from: timeRange.from.valueOf(),
    to: timeRange.to.valueOf(),
  });
  const requestedRangeRef = useRef<NumericTimeRange>();
  const [interaction, setInteraction] = useState<Interaction>();
  const [tool, setTool] = useState<Tool>('zoom');
  const [selection, setSelection] = useState<Selection>();
  const [plotRect, setPlotRect] = useState<PlotRect>();

  const ranges = useMemo(() => options.ranges ?? [], [options.ranges]);
  const notes = useMemo(() => options.notes ?? [], [options.notes]);
  const normalizationTimeZone = Array.isArray(timeZone) ? timeZone[0] : timeZone;
  const normalizedFrames = useMemo(
    () => normalizeTimeSeriesFrames(data.series, normalizationTimeZone),
    [data.series, normalizationTimeZone]
  );
  const displayFrames = useMemo(
    () => applySeriesDisplayOptions(normalizedFrames, options),
    [normalizedFrames, options]
  );
  const rangeColor = options.rangeColor ?? '#FF9830';
  const noteColor = options.noteColor ?? '#FFDB5C';
  const rangeBackground = colorManipulator.alpha(
    theme.visualization.getColorByName(rangeColor),
    clamp(options.rangeOpacity ?? 20, 0, 100) / 100
  );
  const noteBackground = colorManipulator.alpha(
    theme.visualization.getColorByName(noteColor),
    clamp(options.noteOpacity ?? 55, 0, 100) / 100
  );
  const domainFrom = timeRange.from.valueOf();
  const domainTo = Math.max(domainFrom + 1, timeRange.to.valueOf());
  const effectivePlotRect = plotRect ?? {
    left: 54,
    top: 10,
    width: Math.max(1, width - 68),
    height: Math.max(1, height - 54),
  };

  const hasGraphableData = useMemo(
    () =>
      displayFrames.some(
        (frame) =>
          frame.fields.some(
            (field) => field.type === FieldType.time && field.values.some((value) => Number.isFinite(value))
          ) && frame.fields.some((field) => field.type === FieldType.number)
      ),
    [displayFrames]
  );
  const legend = useMemo(
    () => ({
      calcs: [],
      displayMode: LegendDisplayMode.List,
      placement: 'bottom' as const,
      showLegend: options.showLegend !== false,
    }),
    [options.showLegend]
  );
  const tooltipTimeZone = Array.isArray(timeZone) ? (timeZone[0] ?? 'browser') : timeZone;

  const timeToRatio = useCallback(
    (time: number) => (time - domainFrom) / (domainTo - domainFrom),
    [domainFrom, domainTo]
  );
  const clientXToTime = useCallback(
    (clientX: number) => {
      const rect = plotRef.current?.getBoundingClientRect();
      if (!rect) {
        return domainFrom;
      }
      return domainFrom + clamp((clientX - rect.left) / rect.width, 0, 1) * (domainTo - domainFrom);
    },
    [domainFrom, domainTo]
  );
  const updatePlotRect = useCallback((next: PlotRect) => {
    setPlotRect((current) => {
      if (
        current &&
        Math.abs(current.left - next.left) < 0.5 &&
        Math.abs(current.top - next.top) < 0.5 &&
        Math.abs(current.width - next.width) < 0.5 &&
        Math.abs(current.height - next.height) < 0.5
      ) {
        return current;
      }
      return next;
    });
  }, []);
  const commit = useCallback(
    (next: Partial<TimeOverlayOptions>) => onOptionsChange({ ...options, ...next }),
    [onOptionsChange, options]
  );
  const updateInteraction = useCallback((next: Interaction | undefined) => {
    interactionRef.current = next;
    setInteraction(next);
  }, []);
  const changeTimeRange = useCallback(
    (next: NumericTimeRange) => {
      const rounded = { from: Math.round(next.from), to: Math.round(next.to) };
      requestedRangeRef.current = rounded;
      onChangeTimeRange(rounded);
    },
    [onChangeTimeRange]
  );
  const handleZoom = useCallback(
    (next: NumericTimeRange) => changeTimeRange(calculateZoomRange(next, 1, baselineRangeRef.current)),
    [changeTimeRange]
  );
  const zoomIn = useCallback(() => {
    changeTimeRange(calculateZoomRange({ from: domainFrom, to: domainTo }, 0.5, baselineRangeRef.current));
  }, [changeTimeRange, domainFrom, domainTo]);
  const zoomOut = useCallback(() => {
    changeTimeRange(calculateZoomRange({ from: domainFrom, to: domainTo }, 1.5, baselineRangeRef.current));
  }, [changeTimeRange, domainFrom, domainTo]);
  const zoomAll = useCallback(() => changeTimeRange(baselineRangeRef.current), [changeTimeRange]);

  useEffect(() => {
    const current = { from: domainFrom, to: domainTo };
    const requested = requestedRangeRef.current;
    if (requested && requested.from === current.from && requested.to === current.to) {
      requestedRangeRef.current = undefined;
      return;
    }
    baselineRangeRef.current = current;
    requestedRangeRef.current = undefined;
  }, [domainFrom, domainTo]);

  useEffect(() => {
    if (!interaction) {
      return;
    }
    const handleMove = (event: PointerEvent) => {
      const current = interactionRef.current;
      const rect = plotRef.current?.getBoundingClientRect();
      if (!current || !rect) {
        return;
      }
      if (current.kind === 'create-range') {
        updateInteraction({ ...current, current: clientXToTime(event.clientX) });
      } else if (current.kind === 'move-range') {
        const delta = clientXToTime(event.clientX) - current.pointerStart;
        const duration = current.to - current.from;
        const from = clamp(current.from + delta, domainFrom, domainTo - duration);
        commit({
          ranges: ranges.map((range) => (range.id === current.id ? { ...range, from, to: from + duration } : range)),
        });
      } else if (current.kind === 'resize-range') {
        const pointerTime = clientXToTime(event.clientX);
        commit({
          ranges: ranges.map((range) => {
            if (range.id !== current.id) {
              return range;
            }
            return current.edge === 'from'
              ? { ...range, from: Math.min(pointerTime, range.to - 1) }
              : { ...range, to: Math.max(pointerTime, range.from + 1) };
          }),
        });
      } else {
        const deltaX = (event.clientX - current.clientX) / rect.width;
        const deltaY = (event.clientY - current.clientY) / rect.height;
        if (current.kind === 'move-note') {
          const x = clamp(current.note.x + deltaX, 0, 1 - current.note.width);
          const y = clamp(current.note.y + deltaY, 0, 1 - current.note.height);
          commit({ notes: notes.map((note) => (note.id === current.id ? { ...note, x, y } : note)) });
        } else {
          const noteWidth = clamp(current.note.width + deltaX, 90 / rect.width, 1 - current.note.x);
          const noteHeight = clamp(current.note.height + deltaY, 54 / rect.height, 1 - current.note.y);
          commit({
            notes: notes.map((note) =>
              note.id === current.id ? { ...note, width: noteWidth, height: noteHeight } : note
            ),
          });
        }
      }
    };
    const handleUp = () => {
      const current = interactionRef.current;
      if (current?.kind === 'create-range') {
        const from = Math.min(current.start, current.current);
        const to = Math.max(current.start, current.current);
        if ((to - from) / (domainTo - domainFrom) >= 0.005) {
          const rangeId = makeId('range');
          commit({ ranges: [...ranges, { id: rangeId, from, to }] });
          setSelection({ kind: 'range', id: rangeId });
        }
      }
      updateInteraction(undefined);
    };
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp, { once: true });
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [clientXToTime, commit, domainFrom, domainTo, interaction, notes, ranges, updateInteraction]);

  if (!hasGraphableData) {
    return (
      <PanelDataErrorView
        fieldConfig={fieldConfig}
        panelId={id}
        data={data}
        needsTimeField
        needsNumberField
        message="DigitalRCS-TimeOverlay-Panel needs a Grafana time field and at least one numeric field. Untyped tables may use time or _time as the time column."
      />
    );
  }

  const rangePreview =
    interaction?.kind === 'create-range'
      ? {
          id: 'preview',
          from: Math.min(interaction.start, interaction.current),
          to: Math.max(interaction.start, interaction.current),
        }
      : undefined;
  const visibleRanges: TimeRangeOverlay[] = rangePreview ? [...ranges, rangePreview] : ranges;
  const isRenderRoute = typeof window !== 'undefined' && /\/render(?:\/|$)/.test(window.location.pathname);
  const addNote = () => {
    const noteId = makeId('note');
    const note: NoteOverlay = { id: noteId, text: 'Add your note…', x: 0.35, y: 0.28, width: 0.3, height: 0.25 };
    commit({ notes: [...notes, note] });
    setSelection({ kind: 'note', id: noteId });
    setTool('zoom');
  };
  const removeSelected = () => {
    if (!selection) {
      return;
    }
    commit(
      selection.kind === 'range'
        ? { ranges: ranges.filter((range) => range.id !== selection.id) }
        : { notes: notes.filter((note) => note.id !== selection.id) }
    );
    setSelection(undefined);
  };

  return (
    <div ref={rootRef} className={styles.root} style={{ width, height }} data-testid="time-overlay-panel">
      <div className={styles.chart}>
        <TimeSeries
          frames={displayFrames}
          width={width}
          height={height}
          timeRange={timeRange}
          timeZone={timeZone}
          legend={legend}
          options={options}
        >
          {(config, alignedFrame) => (
            <>
              <ZoomPlugin config={config} onZoom={handleZoom} withZoomY />
              <TooltipPlugin
                config={config}
                data={alignedFrame}
                frames={displayFrames}
                timeZone={tooltipTimeZone}
                mode={TooltipDisplayMode.Multi}
                sortOrder={SortOrder.None}
              />
              <PlotBridge config={config} rootRef={rootRef} onPlotRect={updatePlotRect} />
            </>
          )}
        </TimeSeries>
      </div>

      {options.showToolbar !== false && !isRenderRoute ? (
        <div className={styles.toolbar} data-testid="overlay-toolbar">
          <button
            type="button"
            className={cx(styles.toolButton, tool === 'zoom' && styles.activeTool)}
            onClick={() => setTool('zoom')}
            aria-label="Select an area to zoom"
          >
            <Icon name="cursor-logo" size="sm" /> Select
          </button>
          <button
            type="button"
            className={cx(styles.toolButton, styles.compactToolButton)}
            onClick={zoomIn}
            aria-label="Zoom in 50 percent"
            title="Zoom in 50%"
          >
            <Icon name="search-plus" size="sm" />
          </button>
          <button
            type="button"
            className={cx(styles.toolButton, styles.compactToolButton)}
            onClick={zoomOut}
            aria-label="Zoom out 50 percent"
            title="Zoom out 50%"
          >
            <Icon name="search-minus" size="sm" />
          </button>
          <button
            type="button"
            className={cx(styles.toolButton, styles.compactToolButton)}
            onClick={zoomAll}
            aria-label="Zoom all"
            title="Restore the original time range"
          >
            <Icon name="expand-arrows-alt" size="sm" />
          </button>
          <button
            type="button"
            className={cx(styles.toolButton, tool === 'range' && styles.activeTool)}
            onClick={() => setTool('range')}
            aria-label="Draw time range"
          >
            <Icon name="clock-nine" size="sm" /> Range
          </button>
          <button type="button" className={styles.toolButton} onClick={addNote} aria-label="Add note">
            <Icon name="comment-alt" size="sm" /> Note
          </button>
          {selection ? (
            <button
              type="button"
              className={styles.toolButton}
              onClick={removeSelected}
              aria-label="Delete selected overlay"
            >
              <Icon name="trash-alt" size="sm" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        ref={plotRef}
        className={cx(styles.plot, tool === 'range' && styles.drawingPlot)}
        style={effectivePlotRect}
        data-testid="plot-area"
        onPointerDown={(event) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          setSelection(undefined);
          if (tool === 'range' && event.button === 0) {
            const start = clientXToTime(event.clientX);
            updateInteraction({ kind: 'create-range', start, current: start });
          }
        }}
      >
        {visibleRanges.map((range) => {
          const left = clamp(timeToRatio(range.from), 0, 1);
          const right = clamp(timeToRatio(range.to), 0, 1);
          const selected = selection?.kind === 'range' && selection.id === range.id;
          return (
            <div
              key={range.id}
              className={cx(styles.range, selected && styles.selected)}
              style={{
                left: `${left * 100}%`,
                width: `${Math.max(0.002, right - left) * 100}%`,
                background: rangeBackground,
              }}
              data-testid={range.id === 'preview' ? 'range-preview' : 'time-range-overlay'}
              onPointerDown={(event) => {
                if (range.id === 'preview' || event.button !== 0) {
                  return;
                }
                event.stopPropagation();
                setSelection({ kind: 'range', id: range.id });
                updateInteraction({
                  kind: 'move-range',
                  id: range.id,
                  pointerStart: clientXToTime(event.clientX),
                  from: range.from,
                  to: range.to,
                });
              }}
            >
              <div className={styles.duration} data-testid="range-duration">
                {formatDuration(range.to - range.from)}
              </div>
              {selected ? (
                <>
                  <span
                    className={styles.handle}
                    style={{ left: -5 }}
                    aria-label="Resize range start"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      updateInteraction({ kind: 'resize-range', id: range.id, edge: 'from' });
                    }}
                  />
                  <span
                    className={styles.handle}
                    style={{ right: -5 }}
                    aria-label="Resize range end"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      updateInteraction({ kind: 'resize-range', id: range.id, edge: 'to' });
                    }}
                  />
                </>
              ) : null}
            </div>
          );
        })}

        {notes.map((note) => {
          const selected = selection?.kind === 'note' && selection.id === note.id;
          return (
            <div
              key={note.id}
              className={cx(styles.note, selected && styles.selected)}
              style={{
                left: `${note.x * 100}%`,
                top: `${note.y * 100}%`,
                width: `${note.width * 100}%`,
                height: `${note.height * 100}%`,
                background: noteBackground,
              }}
              data-testid="note-overlay"
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelection({ kind: 'note', id: note.id });
              }}
            >
              <div
                className={styles.noteHeader}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.stopPropagation();
                  setSelection({ kind: 'note', id: note.id });
                  updateInteraction({
                    kind: 'move-note',
                    id: note.id,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    note,
                  });
                }}
              >
                Note
              </div>
              <textarea
                className={styles.noteText}
                aria-label="Note text"
                value={note.text}
                onChange={(event) => {
                  const text = event.currentTarget.value;
                  commit({ notes: notes.map((item) => (item.id === note.id ? { ...item, text } : item)) });
                }}
                onPointerDown={(event) => event.stopPropagation()}
              />
              {selected ? (
                <span
                  className={styles.resizeHandle}
                  aria-label="Resize note"
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    updateInteraction({
                      kind: 'resize-note',
                      id: note.id,
                      clientX: event.clientX,
                      clientY: event.clientY,
                      note,
                    });
                  }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};
