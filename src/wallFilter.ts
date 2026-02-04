/**
 * Wall Filtering Engine
 * Applies heuristics to identify wall candidates from raw segments
 */

import { Segment, ArcSegment, Polyline } from './types';

export interface FilterConfig {
  minStrokeWidth: number; // Ignore segments thinner than this
  maxStrokeWidth: number; // Thicker than this is suspicious
  minSegmentLength: number; // Ignore very short segments (noise/hatches)
  maxSegmentLength: number; // Unreasonably long segments might be errors
  minSegmentsInPolyline: number; // Must have at least this many segments to form a valid wall
  angleTolerance: number; // degrees, for collinearity testing
}

export const DEFAULT_FILTER_CONFIG: FilterConfig = {
  minStrokeWidth: 0.5,
  maxStrokeWidth: 50,
  minSegmentLength: 10,
  maxSegmentLength: 5000,
  minSegmentsInPolyline: 2,
  angleTolerance: 10,
};

export class WallFilter {
  private config: FilterConfig;
  private discardedTooThin = 0;
  private discardedTooShort = 0;
  private discardedOther = 0;
  private keptCount = 0;

  constructor(config: Partial<FilterConfig> = {}) {
    this.config = { ...DEFAULT_FILTER_CONFIG, ...config };
  }

  /**
   * Filter segments to identify potential wall candidates
   */
  filterSegments(segments: (Segment | ArcSegment)[]): Segment[] {
    const filtered: Segment[] = [];

    for (const seg of segments) {
      const lineSegment = seg as Segment;
      const verdict = this.evaluateSegment(lineSegment);

      if (verdict.keep) {
        filtered.push(lineSegment);
        this.keptCount++;
      } else {
        this.recordDiscarded(verdict.reason);
      }
    }

    return filtered;
  }

  private evaluateSegment(seg: Segment): { keep: boolean; reason: string } {
    // Check stroke width
    if (seg.strokeWidth < this.config.minStrokeWidth) {
      return { keep: false, reason: 'too_thin' };
    }
    if (seg.strokeWidth > this.config.maxStrokeWidth) {
      return { keep: false, reason: 'too_thick' };
    }

    // Check segment length
    const length = this.getSegmentLength(seg);
    if (length < this.config.minSegmentLength) {
      return { keep: false, reason: 'too_short' };
    }
    if (length > this.config.maxSegmentLength) {
      return { keep: false, reason: 'too_long' };
    }

    return { keep: true, reason: 'ok' };
  }

  private getSegmentLength(seg: Segment): number {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private recordDiscarded(reason: string): void {
    if (reason === 'too_thin') {
      this.discardedTooThin++;
    } else if (reason === 'too_short') {
      this.discardedTooShort++;
    } else {
      this.discardedOther++;
    }
  }

  /**
   * Group connected/collinear segments into polylines
   */
  groupIntoPolylines(segments: Segment[]): Polyline[] {
    const polylines: Polyline[] = [];
    const used = new Set<number>();

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;

      const chain = this.buildSegmentChain(segments, i, used);
      if (chain.length >= this.config.minSegmentsInPolyline) {
        const polyline = this.createPolyline(chain, segments);
        polylines.push(polyline);
      }
    }

    return polylines;
  }

  private buildSegmentChain(segments: Segment[], startIdx: number, used: Set<number>): number[] {
    const chain: number[] = [startIdx];
    used.add(startIdx);

    let current = segments[startIdx];
    let forward = true;

    // Extend forward
    while (true) {
      const next = this.findConnectedSegment(segments, current, forward, used);
      if (next === null) break;

      chain.push(next.index);
      used.add(next.index);
      current = segments[next.index];
      forward = next.atEnd;
    }

    // Extend backward
    current = segments[startIdx];
    forward = false;

    while (true) {
      const prev = this.findConnectedSegment(segments, current, forward, used);
      if (prev === null) break;

      chain.unshift(prev.index);
      used.add(prev.index);
      current = segments[prev.index];
      forward = !prev.atEnd;
    }

    return chain;
  }

  private findConnectedSegment(
    segments: Segment[],
    current: Segment,
    forward: boolean,
    used: Set<number>
  ): { index: number; atEnd: boolean } | null {
    const endpoint = forward ? current.end : current.start;
    const threshold = 5; // proximity threshold

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;

      const candidate = segments[i];
      const dist1 = this.distance(endpoint, candidate.start);
      const dist2 = this.distance(endpoint, candidate.end);

      if (dist1 < threshold) {
        return { index: i, atEnd: true };
      }
      if (dist2 < threshold) {
        return { index: i, atEnd: false };
      }
    }

    return null;
  }

  private distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private createPolyline(chainIndices: number[], segments: Segment[]): Polyline {
    const chainSegments = chainIndices.map(i => segments[i]);
    const totalLength = chainSegments.reduce((sum, seg) => sum + this.getSegmentLength(seg), 0);
    const strokeWidth = chainSegments[0].strokeWidth;
    const color = chainSegments[0].color;
    const layer = chainSegments[0].layer;

    return {
      segments: chainSegments,
      totalLength,
      strokeWidth,
      color,
      layer,
    };
  }

  getStats() {
    return {
      kept: this.keptCount,
      discarded: {
        tooThin: this.discardedTooThin,
        tooShort: this.discardedTooShort,
        other: this.discardedOther,
      },
    };
  }
}
