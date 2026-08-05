import { LineInterpolation } from '@grafana/schema';

export interface TimeRangeOverlay {
  id: string;
  from: number;
  to: number;
}

export interface NoteOverlay {
  id: string;
  text: string;
  /** Positions and dimensions are fractions of the plot area. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TimeOverlayOptions {
  ranges: TimeRangeOverlay[];
  notes: NoteOverlay[];
  rangeColor: string;
  rangeOpacity: number;
  noteColor: string;
  noteOpacity: number;
  showPoints: boolean;
  pointSize: number;
  lineInterpolation: LineInterpolation;
  showLegend: boolean;
  showToolbar: boolean;
}
