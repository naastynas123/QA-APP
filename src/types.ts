/**
 * Core type definitions for PDF wall detection system
 */

export interface Point {
  x: number;
  y: number;
}

export interface Segment {
  start: Point;
  end: Point;
  strokeWidth: number;
  color?: string;
  layer?: string;
}

export interface ArcSegment extends Segment {
  type: 'arc';
  center?: Point;
  radius?: number;
  startAngle?: number;
  endAngle?: number;
}

export interface Polyline {
  segments: (Segment | ArcSegment)[];
  totalLength: number; // in PDF units
  strokeWidth: number;
  color?: string;
  layer?: string;
}

export interface WallPath {
  id: string;
  polyline: Polyline;
  lengthMetres: number;
  markers: Marker[];
  confidenceScore: number;
  debugInfo: DebugInfo;
}

export interface Marker {
  id: string;
  chainageMetres: number;
  position: Point;
  segmentIndex: number;
  distanceAlongSegment: number; // in PDF units
}

export interface DimensionLine {
  startPoint: Point;
  endPoint: Point;
  labelText: string;
  labelPosition: Point;
  extensionLineStart?: Point;
  extensionLineEnd?: Point;
  lengthInPDFUnits: number;
}

export interface ScaleInfo {
  metresPerUnit: number | null;
  strategy: 'annotation' | 'dimension-line' | 'fallback';
  confidence: 'high' | 'medium' | 'low';
  sourceInfo: string;
}

export interface DebugInfo {
  totalSegmentsAnalyzed: number;
  segmentsDiscarded: {
    tooThin: number;
    tooShort: number;
    other: number;
  };
  segmentsKept: number;
  connectionIssues: string[];
  scaleInferenceStatus: string;
  notes: string[];
}

export interface DetectionResult {
  wallPaths: WallPath[];
  scaleInfo: ScaleInfo;
  pageWidth: number;
  pageHeight: number;
  totalDimensionLinesFound: number;
  debugLog: string[];
}

export interface PDFGeometry {
  segments: Segment[];
  arcSegments: ArcSegment[];
  dimensionLines: DimensionLine[];
  textElements: { text: string; position: Point; size: number }[];
  page: {
    width: number;
    height: number;
    pageNumber: number;
  };
}
