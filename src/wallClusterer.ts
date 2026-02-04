/**
 * Wall Clustering and Centerline Extraction
 * Groups segments into walls, detects double-line walls, and extracts centerlines
 */

import { Point, Segment, Polyline } from './types';

export interface ClusteringConfig {
  proximityThreshold: number; // pixels, for grouping nearby segments
  angleTolerance: number; // degrees, for checking if segments are roughly parallel
  minSegmentsPerWall: number;
  doubleLineOffset: number; // Expected pixel offset between parallel lines (detect paired walls)
  offsetTolerance: number; // Allow variance in offset detection
}

export const DEFAULT_CLUSTERING_CONFIG: ClusteringConfig = {
  proximityThreshold: 30,
  angleTolerance: 15,
  minSegmentsPerWall: 2,
  doubleLineOffset: 15,
  offsetTolerance: 5,
};

export interface WallCluster {
  id: string;
  segments: Segment[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  isDoubleLine: boolean;
  parallelPartner?: string;
}

export class WallClusterer {
  private config: ClusteringConfig;
  private debugLog: string[] = [];

  constructor(config: Partial<ClusteringConfig> = {}) {
    this.config = { ...DEFAULT_CLUSTERING_CONFIG, ...config };
  }

  /**
   * Cluster segments into walls
   */
  clusterSegments(segments: Segment[]): WallCluster[] {
    this.debugLog = [];
    this.log(`Clustering ${segments.length} segments into walls`);

    if (segments.length === 0) return [];

    const clusters: WallCluster[] = [];
    const used = new Set<number>();

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;

      const cluster = this.growCluster(segments, i, used);
      if (cluster.segments.length >= this.config.minSegmentsPerWall) {
        cluster.id = `wall_${clusters.length + 1}`;
        clusters.push(cluster);
      }
    }

    this.log(`Created ${clusters.length} wall clusters`);

    // Detect parallel pairs (double-line walls)
    this.detectParallelPairs(clusters);

    return clusters;
  }

  /**
   * Grow a cluster starting from seed segment
   */
  private growCluster(segments: Segment[], seed: number, used: Set<number>): WallCluster {
    const cluster: Segment[] = [segments[seed]];
    used.add(seed);
    const seededAngle = this.getSegmentAngle(segments[seed]);

    let grown = true;
    while (grown) {
      grown = false;

      for (let i = 0; i < segments.length; i++) {
        if (used.has(i)) continue;

        const seg = segments[i];
        const segAngle = this.getSegmentAngle(seg);

        // Check if angle is compatible (parallel-ish)
        if (!this.isParallel(seededAngle, segAngle)) continue;

        // Check if close enough to cluster
        if (!this.isNearCluster(seg, cluster)) continue;

        cluster.push(seg);
        used.add(i);
        grown = true;
      }
    }

    return {
      id: '',
      segments: cluster,
      bounds: this.computeBounds(cluster),
      isDoubleLine: false,
    };
  }

  /**
   * Check if angle is roughly parallel to reference angle
   */
  private isParallel(angle1: number, angle2: number): boolean {
    let diff = Math.abs(angle1 - angle2);
    if (diff > 90) diff = 180 - diff; // Handle 180° ambiguity
    return diff < this.config.angleTolerance;
  }

  /**
   * Check if segment is near any segment in cluster
   */
  private isNearCluster(seg: Segment, cluster: Segment[]): boolean {
    const threshold = this.config.proximityThreshold;

    for (const cseg of cluster) {
      const minDist = Math.min(
        this.distancePointToPoint(seg.start, cseg.start),
        this.distancePointToPoint(seg.start, cseg.end),
        this.distancePointToPoint(seg.end, cseg.start),
        this.distancePointToPoint(seg.end, cseg.end)
      );

      if (minDist < threshold) return true;
    }

    return false;
  }

  /**
   * Detect pairs of parallel walls (double-line walls)
   * Extract centerline between them
   */
  private detectParallelPairs(clusters: WallCluster[]): void {
    const paired = new Set<string>();

    for (let i = 0; i < clusters.length; i++) {
      if (paired.has(clusters[i].id)) continue;

      for (let j = i + 1; j < clusters.length; j++) {
        if (paired.has(clusters[j].id)) continue;

        if (this.areParallelPair(clusters[i], clusters[j])) {
          clusters[i].isDoubleLine = true;
          clusters[i].parallelPartner = clusters[j].id;
          clusters[j].isDoubleLine = true;
          clusters[j].parallelPartner = clusters[i].id;
          paired.add(clusters[i].id);
          paired.add(clusters[j].id);
          this.log(`Detected parallel pair: ${clusters[i].id} <-> ${clusters[j].id}`);
        }
      }
    }
  }

  /**
   * Check if two clusters form a parallel pair (double-line wall)
   */
  private areParallelPair(c1: WallCluster, c2: WallCluster): boolean {
    // Must be roughly parallel
    const angle1 = this.getClusterAngle(c1);
    const angle2 = this.getClusterAngle(c2);

    if (!this.isParallel(angle1, angle2)) return false;

    // Must be roughly same length
    const len1 = this.getClusterLength(c1);
    const len2 = this.getClusterLength(c2);
    const lenRatio = Math.max(len1, len2) / Math.min(len1, len2);
    if (lenRatio > 1.5) return false; // Allow up to 50% length difference

    // Must be at expected offset distance
    const dist = this.getClusterDistance(c1, c2);
    if (Math.abs(dist - this.config.doubleLineOffset) > this.config.offsetTolerance) {
      return false;
    }

    return true;
  }

  /**
   * Extract centerline polyline from a cluster (or pair of parallel clusters)
   */
  extractCenterlinePolyline(cluster: WallCluster, partnerCluster?: WallCluster): Polyline {
    if (partnerCluster && cluster.isDoubleLine) {
      // Compute centerline between parallel lines
      return this.computeCenterlineFromParallelPair(cluster, partnerCluster);
    } else {
      // Simple case: centerline = cluster's average path
      return this.computeClusterCenterline(cluster);
    }
  }

  /**
   * Compute centerline from a pair of parallel walls
   */
  private computeCenterlineFromParallelPair(c1: WallCluster, c2: WallCluster): Polyline {
    // Sort both clusters' segments end-to-end to form polylines
    const poly1 = this.orderSegmentsIntoPolyline(c1.segments);
    const poly2 = this.orderSegmentsIntoPolyline(c2.segments);

    // Sample points along both polylines and compute midpoints
    const points1 = this.samplePolylinePoints(poly1, 10); // Sample every 10 pixels
    const points2 = this.samplePolylinePoints(poly2, 10);

    const centerlineSegments: Segment[] = [];

    // Assume poly1 and poly2 have similar # of points due to similarity check
    const minLen = Math.min(points1.length, points2.length);

    for (let i = 0; i < minLen - 1; i++) {
      const mid1 = this.midpoint(points1[i], points1[i + 1]);
      const mid2 = this.midpoint(points2[i], points2[i + 1]);

      centerlineSegments.push({
        start: mid1,
        end: mid2,
        strokeWidth: (c1.segments[0].strokeWidth + c2.segments[0].strokeWidth) / 2,
      });
    }

    return {
      segments: centerlineSegments,
      totalLength: this.computePolylineLength(centerlineSegments),
      strokeWidth: (c1.segments[0].strokeWidth + c2.segments[0].strokeWidth) / 2,
    };
  }

  /**
   * Compute centerline for a single cluster
   */
  private computeClusterCenterline(cluster: WallCluster): Polyline {
    const poly = this.orderSegmentsIntoPolyline(cluster.segments);
    return {
      segments: poly,
      totalLength: this.computePolylineLength(poly),
      strokeWidth: cluster.segments[0].strokeWidth,
    };
  }

  /**
   * Order segments end-to-end to form a continuous polyline
   */
  private orderSegmentsIntoPolyline(segments: Segment[]): Segment[] {
    if (segments.length <= 1) return segments;

    const ordered: Segment[] = [segments[0]];
    const remaining = new Set(segments.slice(1));

    while (remaining.size > 0) {
      const current = ordered[ordered.length - 1];
      let found = false;

      for (const seg of remaining) {
        // Check if start connects to current end
        if (this.distancePointToPoint(seg.start, current.end) < 20) {
          ordered.push(seg);
          remaining.delete(seg);
          found = true;
          break;
        }
        // Check if end connects to current end (need to flip)
        if (this.distancePointToPoint(seg.end, current.end) < 20) {
          ordered.push({
            ...seg,
            start: seg.end,
            end: seg.start,
          });
          remaining.delete(seg);
          found = true;
          break;
        }
      }

      if (!found) {
        // Can't extend further, break the polyline
        if (remaining.size > 0) {
          const next = remaining.values().next().value;
          ordered.push(next);
          remaining.delete(next);
        }
      }
    }

    return ordered;
  }

  /**
   * Sample points along a polyline at regular intervals
   */
  private samplePolylinePoints(polyline: Segment[], interval: number): Point[] {
    const points: Point[] = [];
    let distanceAccum = 0;
    const totalLen = this.computePolylineLength(polyline);

    for (const seg of polyline) {
      const segLen = this.distancePointToPoint(seg.start, seg.end);

      // Sample points along this segment
      let d = 0;
      while (d <= segLen) {
        const t = d / segLen;
        const p = {
          x: seg.start.x + t * (seg.end.x - seg.start.x),
          y: seg.start.y + t * (seg.end.y - seg.start.y),
        };
        points.push(p);
        d += interval;
      }

      distanceAccum += segLen;
    }

    return points;
  }

  private midpoint(p1: Point, p2: Point): Point {
    return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
  }

  private computePolylineLength(segments: Segment[]): number {
    return segments.reduce((sum, seg) => sum + this.distancePointToPoint(seg.start, seg.end), 0);
  }

  private getSegmentAngle(seg: Segment): number {
    return (Math.atan2(seg.end.y - seg.start.y, seg.end.x - seg.start.x) * 180) / Math.PI;
  }

  private getClusterAngle(cluster: WallCluster): number {
    // Use longest segment's angle as representative
    const longest = cluster.segments.reduce((prev, curr) =>
      this.distancePointToPoint(prev.start, prev.end) >
      this.distancePointToPoint(curr.start, curr.end)
        ? prev
        : curr
    );
    return this.getSegmentAngle(longest);
  }

  private getClusterLength(cluster: WallCluster): number {
    return cluster.segments.reduce(
      (sum, seg) => sum + this.distancePointToPoint(seg.start, seg.end),
      0
    );
  }

  private getClusterDistance(c1: WallCluster, c2: WallCluster): number {
    let minDist = Infinity;

    for (const seg1 of c1.segments) {
      for (const seg2 of c2.segments) {
        const d = Math.min(
          this.distancePointToPoint(seg1.start, seg2.start),
          this.distancePointToPoint(seg1.start, seg2.end),
          this.distancePointToPoint(seg1.end, seg2.start),
          this.distancePointToPoint(seg1.end, seg2.end)
        );
        minDist = Math.min(minDist, d);
      }
    }

    return minDist;
  }

  private computeBounds(segments: Segment[]): WallCluster['bounds'] {
    const xs = segments.flatMap(s => [s.start.x, s.end.x]);
    const ys = segments.flatMap(s => [s.start.y, s.end.y]);

    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  }

  private distancePointToPoint(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private log(message: string): void {
    this.debugLog.push(`[WallClusterer] ${message}`);
    console.log(`[WallClusterer] ${message}`);
  }

  getDebugLog(): string[] {
    return this.debugLog;
  }
}
