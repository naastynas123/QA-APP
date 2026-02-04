/**
 * Deterministic Label Placement Along Polylines
 * Places labels evenly spaced along wall centerlines with proper orientation
 */

import { Point, Segment, Polyline } from './types';

export interface LabelPlacementConfig {
  spacingMetres: number; // Default spacing
  startOffsetMetres: number; // Offset from wall start (metres)
  perpendicularOffsetPixels: number; // Offset perpendicular to wall for label readability
}

export const DEFAULT_LABEL_CONFIG: LabelPlacementConfig = {
  spacingMetres: 5,
  startOffsetMetres: 0,
  perpendicularOffsetPixels: 20,
};

export interface LabelPlacement {
  id: string;
  position: Point;
  chainage: number; // Distance from wall start in metres
  angle: number; // Orientation angle in degrees (0-360)
  alignmentStartPoint: Point; // Point on wall where this label applies
}

export class LabelAlongPolyline {
  private config: LabelPlacementConfig;

  constructor(config: Partial<LabelPlacementConfig> = {}) {
    this.config = { ...DEFAULT_LABEL_CONFIG, ...config };
  }

  /**
   * Place labels evenly along a polyline
   * @param polyline The wall centerline
   * @param metresPerPixel Scale conversion factor
   * @param wallId ID of the wall
   * @param anchorMode 'start' = from beginning, 'middle' = from centre, 'custom' = startOffsetMetres
   */
  placeLabelsPoly(
    polyline: Polyline,
    metresPerPixel: number,
    wallId: string,
    anchorMode: 'start' | 'middle' | 'custom' = 'start'
  ): LabelPlacement[] {
    const labels: LabelPlacement[] = [];

    // Convert polyline length to metres
    const wallLengthMetres = polyline.totalLength * metresPerPixel;
    const spacingPixels = this.config.spacingMetres / metresPerPixel;

    // Determine starting position
    let startMetres = 0;
    if (anchorMode === 'middle') {
      startMetres = wallLengthMetres / 2;
    } else if (anchorMode === 'custom') {
      startMetres = this.config.startOffsetMetres;
    }

    const startPixels = startMetres / metresPerPixel;
    let distanceAlongMetres = startMetres;
    let distanceAlongPixels = startPixels;

    let labelCount = 1;

    while (distanceAlongMetres < wallLengthMetres) {
      // Find point on polyline at this distance
      const pointData = this.findPointAlongPolyline(polyline, distanceAlongPixels);

      if (pointData) {
        const label: LabelPlacement = {
          id: `${wallId}_label_${labelCount}`,
          position: pointData.position,
          chainage: distanceAlongMetres,
          angle: pointData.angle,
          alignmentStartPoint: pointData.segmentStart,
        };

        labels.push(label);
        labelCount++;
      }

      distanceAlongMetres += this.config.spacingMetres;
      distanceAlongPixels += spacingPixels;
    }

    return labels;
  }

  /**
   * Find a point along a polyline at a given distance from the start
   */
  private findPointAlongPolyline(
    polyline: Polyline,
    targetDistance: number
  ): {
    position: Point;
    angle: number;
    segmentStart: Point;
  } | null {
    let accumulatedDistance = 0;

    for (const seg of polyline.segments) {
      const segmentLength = this.distancePointToPoint(seg.start, seg.end);

      if (accumulatedDistance + segmentLength >= targetDistance) {
        // Target is within this segment
        const distanceInSegment = targetDistance - accumulatedDistance;
        const t = distanceInSegment / segmentLength;

        const position = {
          x: seg.start.x + t * (seg.end.x - seg.start.x),
          y: seg.start.y + t * (seg.end.y - seg.start.y),
        };

        const angle = this.getSegmentAngle(seg);

        // Apply perpendicular offset for label readability
        const offsetPos = this.offsetPointPerpendicular(position, angle, this.config.perpendicularOffsetPixels);

        return {
          position: offsetPos,
          angle,
          segmentStart: seg.start,
        };
      }

      accumulatedDistance += segmentLength;
    }

    return null;
  }

  /**
   * Offset a point perpendicular to a given angle
   */
  private offsetPointPerpendicular(point: Point, angleDegs: number, offsetPixels: number): Point {
    const perpAngleRads = ((angleDegs + 90) * Math.PI) / 180;
    return {
      x: point.x + offsetPixels * Math.cos(perpAngleRads),
      y: point.y + offsetPixels * Math.sin(perpAngleRads),
    };
  }

  private getSegmentAngle(seg: Segment): number {
    return (Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x) * 180) / Math.PI;
  }

  private distancePointToPoint(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
