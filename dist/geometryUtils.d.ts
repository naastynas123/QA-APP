/**
 * Geometry Utilities
 * Pure geometry functions for polyline operations
 */
import { Point, Polyline, Segment, ArcSegment } from './types';
export declare class GeometryUtils {
    /**
     * Calculate the total length of a polyline in PDF units
     */
    static getPolylineLength(polyline: Polyline): number;
    /**
     * Get the length of a single segment in PDF units
     */
    static getSegmentLength(seg: Segment | ArcSegment): number;
    /**
     * Interpolate a point at a given distance along a polyline
     * @param polyline - The polyline to traverse
     * @param distanceMetres - Target distance in metres
     * @param metresPerUnit - Conversion factor from PDF units to metres
     * @returns Point and which segment it's on, or null if distance exceeds polyline length
     */
    static interpolatePointAtDistance(polyline: Polyline, distanceMetres: number, metresPerUnit: number): {
        point: Point;
        segmentIndex: number;
        distanceAlongSegment: number;
    } | null;
    /**
     * Calculate the angle of a segment (in degrees, 0-360)
     */
    static getSegmentAngle(seg: Segment | ArcSegment): number;
    /**
     * Check if two segments are collinear (within tolerance)
     */
    static areSegmentsCollinear(seg1: Segment | ArcSegment, seg2: Segment | ArcSegment, angleTolerance?: number): boolean;
    /**
     * Calculate distance between two points
     */
    static distance(p1: Point, p2: Point): number;
    /**
     * Check if two points are approximately equal
     */
    static pointsEqual(p1: Point, p2: Point, threshold?: number): boolean;
    /**
     * Approximate arc length of a Bezier curve (for curved segments)
     * Using numerical integration (Simpson's rule)
     */
    static approximateArcLength(seg: ArcSegment, steps?: number): number;
    /**
     * Check if a point lies near a segment
     */
    static pointNearSegment(point: Point, seg: Segment | ArcSegment, threshold?: number): boolean;
}
//# sourceMappingURL=geometryUtils.d.ts.map