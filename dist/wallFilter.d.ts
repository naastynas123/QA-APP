/**
 * Wall Filtering Engine
 * Applies heuristics to identify wall candidates from raw segments
 */
import { Segment, ArcSegment, Polyline } from './types';
export interface FilterConfig {
    minStrokeWidth: number;
    maxStrokeWidth: number;
    minSegmentLength: number;
    maxSegmentLength: number;
    minSegmentsInPolyline: number;
    angleTolerance: number;
}
export declare const DEFAULT_FILTER_CONFIG: FilterConfig;
export declare class WallFilter {
    private config;
    private discardedTooThin;
    private discardedTooShort;
    private discardedOther;
    private keptCount;
    constructor(config?: Partial<FilterConfig>);
    /**
     * Filter segments to identify potential wall candidates
     */
    filterSegments(segments: (Segment | ArcSegment)[]): Segment[];
    private evaluateSegment;
    private getSegmentLength;
    private recordDiscarded;
    /**
     * Group connected/collinear segments into polylines
     */
    groupIntoPolylines(segments: Segment[]): Polyline[];
    private buildSegmentChain;
    private findConnectedSegment;
    private distance;
    private createPolyline;
    getStats(): {
        kept: number;
        discarded: {
            tooThin: number;
            tooShort: number;
            other: number;
        };
    };
}
//# sourceMappingURL=wallFilter.d.ts.map