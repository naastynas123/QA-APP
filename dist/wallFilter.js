"use strict";
/**
 * Wall Filtering Engine
 * Applies heuristics to identify wall candidates from raw segments
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallFilter = exports.DEFAULT_FILTER_CONFIG = void 0;
exports.DEFAULT_FILTER_CONFIG = {
    minStrokeWidth: 0.5,
    maxStrokeWidth: 50,
    minSegmentLength: 10,
    maxSegmentLength: 5000,
    minSegmentsInPolyline: 2,
    angleTolerance: 10,
};
class WallFilter {
    constructor(config = {}) {
        this.discardedTooThin = 0;
        this.discardedTooShort = 0;
        this.discardedOther = 0;
        this.keptCount = 0;
        this.config = { ...exports.DEFAULT_FILTER_CONFIG, ...config };
    }
    /**
     * Filter segments to identify potential wall candidates
     */
    filterSegments(segments) {
        const filtered = [];
        for (const seg of segments) {
            const lineSegment = seg;
            const verdict = this.evaluateSegment(lineSegment);
            if (verdict.keep) {
                filtered.push(lineSegment);
                this.keptCount++;
            }
            else {
                this.recordDiscarded(verdict.reason);
            }
        }
        return filtered;
    }
    evaluateSegment(seg) {
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
    getSegmentLength(seg) {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    recordDiscarded(reason) {
        if (reason === 'too_thin') {
            this.discardedTooThin++;
        }
        else if (reason === 'too_short') {
            this.discardedTooShort++;
        }
        else {
            this.discardedOther++;
        }
    }
    /**
     * Group connected/collinear segments into polylines
     */
    groupIntoPolylines(segments) {
        const polylines = [];
        const used = new Set();
        for (let i = 0; i < segments.length; i++) {
            if (used.has(i))
                continue;
            const chain = this.buildSegmentChain(segments, i, used);
            if (chain.length >= this.config.minSegmentsInPolyline) {
                const polyline = this.createPolyline(chain, segments);
                polylines.push(polyline);
            }
        }
        return polylines;
    }
    buildSegmentChain(segments, startIdx, used) {
        const chain = [startIdx];
        used.add(startIdx);
        let current = segments[startIdx];
        let forward = true;
        // Extend forward
        while (true) {
            const next = this.findConnectedSegment(segments, current, forward, used);
            if (next === null)
                break;
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
            if (prev === null)
                break;
            chain.unshift(prev.index);
            used.add(prev.index);
            current = segments[prev.index];
            forward = !prev.atEnd;
        }
        return chain;
    }
    findConnectedSegment(segments, current, forward, used) {
        const endpoint = forward ? current.end : current.start;
        const threshold = 5; // proximity threshold
        for (let i = 0; i < segments.length; i++) {
            if (used.has(i))
                continue;
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
    distance(p1, p2) {
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    createPolyline(chainIndices, segments) {
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
exports.WallFilter = WallFilter;
//# sourceMappingURL=wallFilter.js.map