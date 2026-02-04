/**
 * Geometry Utilities
 * Pure geometry functions for polyline operations
 */

import { Point, Polyline, Segment, ArcSegment } from './types';

export class GeometryUtils {
  /**
   * Calculate the total length of a polyline in PDF units
   */
  static getPolylineLength(polyline: Polyline): number {
    return polyline.totalLength;
  }

  /**
   * Get the length of a single segment in PDF units
   */
  static getSegmentLength(seg: Segment | ArcSegment): number {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Interpolate a point at a given distance along a polyline
   * @param polyline - The polyline to traverse
   * @param distanceMetres - Target distance in metres
   * @param metresPerUnit - Conversion factor from PDF units to metres
   * @returns Point and which segment it's on, or null if distance exceeds polyline length
   */
  static interpolatePointAtDistance(
    polyline: Polyline,
    distanceMetres: number,
    metresPerUnit: number
  ): {
    point: Point;
    segmentIndex: number;
    distanceAlongSegment: number;
  } | null {
    if (metresPerUnit === null || metresPerUnit === 0) {
      return null;
    }

    const distancePDFUnits = distanceMetres / metresPerUnit;
    let accumulatedDistance = 0;

    for (let i = 0; i < polyline.segments.length; i++) {
      const seg = polyline.segments[i];
      const segLength = this.getSegmentLength(seg);

      if (accumulatedDistance + segLength >= distancePDFUnits) {
        // Target point is on this segment
        const distanceAlongThisSegment = distancePDFUnits - accumulatedDistance;
        const t = distanceAlongThisSegment / segLength; // 0 to 1 interpolation factor

        const point = {
          x: seg.start.x + t * (seg.end.x - seg.start.x),
          y: seg.start.y + t * (seg.end.y - seg.start.y),
        };

        return {
          point,
          segmentIndex: i,
          distanceAlongSegment: distanceAlongThisSegment,
        };
      }

      accumulatedDistance += segLength;
    }

    // Distance exceeds polyline length
    return null;
  }

  /**
   * Calculate the angle of a segment (in degrees, 0-360)
   */
  static getSegmentAngle(seg: Segment | ArcSegment): number {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return angle < 0 ? angle + 360 : angle;
  }

  /**
   * Check if two segments are collinear (within tolerance)
   */
  static areSegmentsCollinear(seg1: Segment | ArcSegment, seg2: Segment | ArcSegment, angleTolerance: number = 10): boolean {
    const angle1 = this.getSegmentAngle(seg1);
    const angle2 = this.getSegmentAngle(seg2);

    // Normalize angles to 0-180 for comparison (lines can go either direction)
    const normalizedAngle1 = angle1 > 180 ? angle1 - 180 : angle1;
    const normalizedAngle2 = angle2 > 180 ? angle2 - 180 : angle2;

    const difference = Math.abs(normalizedAngle1 - normalizedAngle2);
    return difference < angleTolerance || difference > 180 - angleTolerance;
  }

  /**
   * Calculate distance between two points
   */
  static distance(p1: Point, p2: Point): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Check if two points are approximately equal
   */
  static pointsEqual(p1: Point, p2: Point, threshold: number = 1): boolean {
    return this.distance(p1, p2) < threshold;
  }

  /**
   * Approximate arc length of a Bezier curve (for curved segments)
   * Using numerical integration (Simpson's rule)
   */
  static approximateArcLength(seg: ArcSegment, steps: number = 10): number {
    if (!seg.center || !seg.radius) {
      // Fallback to straight line distance
      return this.getSegmentLength(seg);
    }

    // For a circular arc: arc length = radius * angle (in radians)
    if (seg.startAngle !== undefined && seg.endAngle !== undefined) {
      let angleDiff = seg.endAngle - seg.startAngle;
      if (angleDiff < 0) angleDiff += 2 * Math.PI;
      return seg.radius * angleDiff;
    }

    // Fallback
    return this.getSegmentLength(seg);
  }

  /**
   * Check if a point lies near a segment
   */
  static pointNearSegment(point: Point, seg: Segment | ArcSegment, threshold: number = 5): boolean {
    const distToStart = this.distance(point, seg.start);
    const distToEnd = this.distance(point, seg.end);
    const segmentLength = this.getSegmentLength(seg);

    // Project point onto segment line
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const t = Math.max(0, Math.min(1, ((point.x - seg.start.x) * dx + (point.y - seg.start.y) * dy) / (dx * dx + dy * dy)));

    const closestPoint = {
      x: seg.start.x + t * dx,
      y: seg.start.y + t * dy,
    };

    return this.distance(point, closestPoint) < threshold;
  }
}
