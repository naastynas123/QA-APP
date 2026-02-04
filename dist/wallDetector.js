"use strict";
/**
 * Wall Detector
 * Main orchestrator that coordinates all modules to perform complete wall detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WallDetector = void 0;
exports.detectWallsInPDF = detectWallsInPDF;
const pdfLoader_1 = require("./pdfLoader");
const wallFilter_1 = require("./wallFilter");
const scaleInference_1 = require("./scaleInference");
const wallBuilder_1 = require("./wallBuilder");
const markerGenerator_1 = require("./markerGenerator");
const scoringEngine_1 = require("./scoringEngine");
class WallDetector {
    constructor() {
        this.debugLog = [];
    }
    async detectWallsFromPDF(pdfBuffer, config = {}) {
        this.debugLog = [];
        this.log('Starting wall detection...');
        try {
            // Step 1: Load and extract geometry from PDF
            this.log('Step 1: Loading PDF and extracting geometry');
            const loader = new pdfLoader_1.PDFLoader();
            const pageGeometries = await loader.loadPDF(pdfBuffer);
            this.debugLog.push(...loader.getDebugLog());
            if (pageGeometries.length === 0) {
                throw new Error('No pages extracted from PDF');
            }
            // Use first page for now (can iterate for multi-page PDFs)
            const pageGeo = pageGeometries[0];
            this.log(`Extracted page 1: ${pageGeo.segments.length} line segments, ${pageGeo.arcSegments.length} arcs, ${pageGeo.dimensionLines.length} dimension lines`);
            // Step 2: Infer scale
            this.log('Step 2: Inferring scale from PDF');
            const scaleInference = new scaleInference_1.ScaleInference();
            const pageText = pageGeo.textElements.map(t => t.text);
            const scaleInfo = scaleInference.inferScale(pageGeo.dimensionLines, pageText);
            this.debugLog.push(...scaleInference.getDebugLog());
            this.log(`Scale inference: ${scaleInfo.sourceInfo} (confidence: ${scaleInfo.confidence})`);
            // Step 3: Filter segments for wall candidates
            this.log('Step 3: Filtering segments for wall candidates');
            const wallFilter = new wallFilter_1.WallFilter(config.filterConfig);
            const filteredSegments = wallFilter.filterSegments([
                ...pageGeo.segments,
                ...pageGeo.arcSegments,
            ]);
            const filterStats = wallFilter.getStats();
            this.log(`Filtered: ${filterStats.kept} kept, ${filterStats.discarded.tooThin} too-thin, ${filterStats.discarded.tooShort} too-short`);
            // Step 4: Group into polylines
            this.log('Step 4: Grouping segments into polylines');
            const polylines = wallFilter.groupIntoPolylines(filteredSegments);
            this.log(`Created ${polylines.length} polylines`);
            // Step 5: Build WallPath objects
            this.log('Step 5: Building wall paths');
            let wallPaths = wallBuilder_1.WallBuilder.buildWallPaths(polylines, scaleInfo.metresPerUnit);
            this.log(`Built ${wallPaths.length} wall paths`);
            // Step 6: Optionally merge adjacent walls
            if (config.mergeAdjacentWalls !== false) {
                this.log('Step 6a: Merging adjacent walls');
                const mergedWalls = wallBuilder_1.WallBuilder.mergeAdjacentWalls(wallPaths, config.proximityThreshold || 20, config.angleTolerance || 15);
                this.log(`Merged to ${mergedWalls.length} walls`);
                wallPaths = mergedWalls;
            }
            // Step 6: Generate markers
            this.log('Step 6b: Generating chainaged markers');
            const markerGen = new markerGenerator_1.MarkerGenerator(config.markerConfig);
            wallPaths = markerGen.generateMarkersForAllWalls(wallPaths, scaleInfo.metresPerUnit);
            const totalMarkers = wallPaths.reduce((sum, w) => sum + w.markers.length, 0);
            this.log(`Generated ${totalMarkers} markers across all walls`);
            // Step 7: Compute confidence scores
            this.log('Step 7: Computing confidence scores');
            const scoringEngine = new scoringEngine_1.ScoringEngine(config.scoringConfig);
            wallPaths = wallPaths.map(wall => {
                const score = scoringEngine.computeConfidenceScore(wall);
                const debugInfo = scoringEngine.generateDebugInfo(wall, pageGeo.segments.length, filterStats.discarded);
                return {
                    ...wall,
                    confidenceScore: score,
                    debugInfo,
                };
            });
            const avgConfidence = wallPaths.reduce((sum, w) => sum + w.confidenceScore, 0) / wallPaths.length;
            this.log(`Average confidence score: ${avgConfidence.toFixed(3)}`);
            // Step 8: Generate final report
            this.log('Step 8: Generating final report');
            const report = scoringEngine.generateReport(wallPaths);
            this.debugLog.push(report);
            this.log('Wall detection complete');
            return {
                wallPaths,
                scaleInfo,
                pageWidth: pageGeo.page.width,
                pageHeight: pageGeo.page.height,
                totalDimensionLinesFound: pageGeo.dimensionLines.length,
                debugLog: this.debugLog,
            };
        }
        catch (error) {
            this.log(`ERROR: ${error}`);
            throw error;
        }
    }
    log(message) {
        this.debugLog.push(`[${new Date().toISOString()}] ${message}`);
        console.log(`[WallDetector] ${message}`);
    }
    getDebugLog() {
        return this.debugLog;
    }
}
exports.WallDetector = WallDetector;
/**
 * Convenience function to detect walls and get results
 */
async function detectWallsInPDF(pdfBuffer, config) {
    const detector = new WallDetector();
    return detector.detectWallsFromPDF(pdfBuffer, config);
}
//# sourceMappingURL=wallDetector.js.map