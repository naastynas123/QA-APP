"use strict";
/**
 * Wall Builder
 * Constructs WallPath objects from filtered polylines with metadata
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallBuilder = void 0;
const geometryUtils_1 = require("./geometryUtils");
const uuid_1 = require("uuid");
class WallBuilder {
    /**
     * Build WallPath objects from filtered polylines
     */
    static buildWallPaths(polylines, metresPerUnit, markers = new Map()) {
        const wallPaths = [];
        for (let i = 0; i < polylines.length; i++) {
            const polyline = polylines[i];
            const lengthMetres = metresPerUnit
                ? geometryUtils_1.GeometryUtils.getPolylineLength(polyline) * metresPerUnit
                : -1; // Unknown
            const wallId = (0, uuid_1.v4)();
            const polylineMarkers = markers.get(i) || [];
            const wallPath = {
                id: wallId,
                polyline,
                lengthMetres,
                markers: polylineMarkers,
                confidenceScore: 0, // Will be computed by ScoringEngine
                debugInfo: {
                    totalSegmentsAnalyzed: 0,
                    segmentsDiscarded: { tooThin: 0, tooShort: 0, other: 0 },
                    segmentsKept: polyline.segments.length,
                    connectionIssues: [],
                    scaleInferenceStatus: metresPerUnit ? `${metresPerUnit} m/unit` : 'unknown',
                    notes: [],
                },
            };
            wallPaths.push(wallPath);
        }
        return wallPaths;
    }
    /**
     * Connect fragmented wall segments that should logically form one wall
     */
    static mergeAdjacentWalls(wallPaths, proximityThreshold = 10, angleTolerance = 15) {
        if (wallPaths.length < 2) {
            return wallPaths;
        }
        const merged = [];
        const used = new Set();
        for (let i = 0; i < wallPaths.length; i++) {
            if (used.has(i))
                continue;
            const wall = wallPaths[i];
            const group = [i];
            used.add(i);
            // Look for nearby walls to merge
            for (let j = i + 1; j < wallPaths.length; j++) {
                if (used.has(j))
                    continue;
                if (WallBuilder.shouldMerge(wall, wallPaths[j], proximityThreshold, angleTolerance)) {
                    group.push(j);
                    used.add(j);
                }
            }
            // Merge all walls in group
            if (group.length === 1) {
                merged.push(wall);
            }
            else {
                const mergedWall = WallBuilder.mergeWallGroup(wallPaths, group);
                if (mergedWall) {
                    merged.push(mergedWall);
                }
            }
        }
        return merged;
    }
    static shouldMerge(wall1, wall2, proximityThreshold, angleTolerance) {
        // Check if endpoints are close
        const end1 = wall1.polyline.segments[wall1.polyline.segments.length - 1].end;
        const start2 = wall2.polyline.segments[0].start;
        const distance = geometryUtils_1.GeometryUtils.distance(end1, start2);
        if (distance > proximityThreshold) {
            return false;
        }
        // Check if angles are similar
        const lastSegment1 = wall1.polyline.segments[wall1.polyline.segments.length - 1];
        const firstSegment2 = wall2.polyline.segments[0];
        return geometryUtils_1.GeometryUtils.areSegmentsCollinear(lastSegment1, firstSegment2, angleTolerance);
    }
    static mergeWallGroup(wallPaths, indices) {
        if (indices.length === 0)
            return null;
        // Combine all segments in order
        const allSegments = [];
        for (const idx of indices) {
            allSegments.push(...wallPaths[idx].polyline.segments);
        }
        const mergedPolyline = {
            segments: allSegments,
            totalLength: allSegments.reduce((sum, seg) => sum + geometryUtils_1.GeometryUtils.getSegmentLength(seg), 0),
            strokeWidth: wallPaths[indices[0]].polyline.strokeWidth,
            color: wallPaths[indices[0]].polyline.color,
            layer: wallPaths[indices[0]].polyline.layer,
        };
        const metresPerUnit = wallPaths[indices[0]].lengthMetres / wallPaths[indices[0]].polyline.totalLength;
        const lengthMetres = mergedPolyline.totalLength * metresPerUnit;
        return {
            id: (0, uuid_1.v4)(),
            polyline: mergedPolyline,
            lengthMetres,
            markers: [],
            confidenceScore: 0,
            debugInfo: {
                totalSegmentsAnalyzed: allSegments.length,
                segmentsDiscarded: { tooThin: 0, tooShort: 0, other: 0 },
                segmentsKept: allSegments.length,
                connectionIssues: [],
                scaleInferenceStatus: `${metresPerUnit} m/unit`,
                notes: [`Merged ${indices.length} wall segments`],
            },
        };
    }
    /**
     * Generate textual summary of a wall
     */
    static summarizeWall(wall) {
        return `Wall ${wall.id.substring(0, 8)}: ${wall.lengthMetres > 0 ? wall.lengthMetres.toFixed(2) + ' m' : 'scale unknown'} (${wall.polyline.segments.length} segments, stroke: ${wall.polyline.strokeWidth.toFixed(1)})`;
    }
}
exports.WallBuilder = WallBuilder;
//# sourceMappingURL=wallBuilder.js.map