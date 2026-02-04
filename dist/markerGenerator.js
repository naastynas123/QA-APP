"use strict";
/**
 * Marker Generator
 * Places chainaged markers at regular intervals along wall paths
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarkerGenerator = exports.DEFAULT_MARKER_CONFIG = void 0;
const geometryUtils_1 = require("./geometryUtils");
exports.DEFAULT_MARKER_CONFIG = {
    spacingMetres: 5, // 5-metre intervals
    includeEndpoints: true,
};
class MarkerGenerator {
    constructor(config = {}) {
        this.config = { ...exports.DEFAULT_MARKER_CONFIG, ...config };
    }
    /**
     * Generate markers for a single wall path
     */
    generateMarkersForWall(wall, metresPerUnit) {
        if (!metresPerUnit || metresPerUnit <= 0) {
            return [];
        }
        const markers = [];
        const totalLengthMetres = wall.lengthMetres;
        if (totalLengthMetres <= 0) {
            return markers;
        }
        // Generate markers at regular spacing
        for (let chainageMetres = this.config.spacingMetres; chainageMetres < totalLengthMetres; chainageMetres += this.config.spacingMetres) {
            const interpolation = geometryUtils_1.GeometryUtils.interpolatePointAtDistance(wall.polyline, chainageMetres, metresPerUnit);
            if (interpolation) {
                markers.push({
                    chainageMetres,
                    position: interpolation.point,
                    segmentIndex: interpolation.segmentIndex,
                    distanceAlongSegment: interpolation.distanceAlongSegment,
                });
            }
        }
        // Optionally add endpoint markers
        if (this.config.includeEndpoints) {
            // Start point
            markers.unshift({
                chainageMetres: 0,
                position: wall.polyline.segments[0].start,
                segmentIndex: 0,
                distanceAlongSegment: 0,
            });
            // End point
            const lastSegment = wall.polyline.segments[wall.polyline.segments.length - 1];
            markers.push({
                chainageMetres: totalLengthMetres,
                position: lastSegment.end,
                segmentIndex: wall.polyline.segments.length - 1,
                distanceAlongSegment: geometryUtils_1.GeometryUtils.getSegmentLength(lastSegment),
            });
        }
        return markers;
    }
    /**
     * Generate markers for all wall paths
     */
    generateMarkersForAllWalls(wallPaths, metresPerUnit) {
        return wallPaths.map(wall => ({
            ...wall,
            markers: this.generateMarkersForWall(wall, metresPerUnit),
        }));
    }
    /**
     * Convert markers to canvas coordinates (if needed for rendering)
     */
    static markerToCanvasCoords(marker, pageScale = 1) {
        return {
            x: marker.position.x * pageScale,
            y: marker.position.y * pageScale,
        };
    }
    /**
     * Generate a CSV representation of markers for export
     */
    static exportMarkersToCSV(wallPaths) {
        let csv = 'WallID,Chainage(m),X(PDFUnits),Y(PDFUnits),SegmentIndex\n';
        for (const wall of wallPaths) {
            for (const marker of wall.markers) {
                csv += `${wall.id},${marker.chainageMetres.toFixed(2)},${marker.position.x.toFixed(2)},${marker.position.y.toFixed(2)},${marker.segmentIndex}\n`;
            }
        }
        return csv;
    }
}
exports.MarkerGenerator = MarkerGenerator;
//# sourceMappingURL=markerGenerator.js.map