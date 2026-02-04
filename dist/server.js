"use strict";
/**
 * Express Server with Wall Detection API
 * Accepts PDF uploads and returns wall detection results
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const wallDetector_1 = require("./wallDetector");
const markerGenerator_1 = require("./markerGenerator");
const app = (0, express_1.default)();
const upload = (0, multer_1.default)({ dest: 'uploads/', limits: { fileSize: 50 * 1024 * 1024 } });
// Middleware
app.use(express_1.default.json());
app.use(express_1.default.static('public'));
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'wall-detector' });
});
/**
 * POST /api/detect-walls
 * Upload PDF and get wall detection results
 *
 * Request:
 *   - file: PDF file (multipart/form-data)
 *   - config (optional): JSON string with detection config
 *
 * Response:
 *   - wallPaths: Array of detected walls with markers
 *   - scaleInfo: Scale information (metresPerUnit, strategy, confidence)
 *   - pageWidth, pageHeight: PDF page dimensions
 *   - totalDimensionLinesFound: Count of dimension lines
 *   - debugLog: Detailed log of detection process
 */
app.post('/api/detect-walls', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No PDF file provided' });
        }
        const filePath = req.file.path;
        console.log(`[API] Processing PDF: ${filePath}`);
        // Read PDF file
        const pdfBuffer = fs_1.default.readFileSync(filePath);
        // Parse optional config
        let config = {};
        if (req.body.config) {
            try {
                config = JSON.parse(req.body.config);
            }
            catch (e) {
                console.warn('[API] Failed to parse config, using defaults:', e);
            }
        }
        // Run detection
        const result = await (0, wallDetector_1.detectWallsInPDF)(pdfBuffer, config);
        // Clean up uploaded file
        fs_1.default.unlinkSync(filePath);
        console.log(`[API] Detection complete: ${result.wallPaths.length} walls found`);
        // Return results
        return res.json({
            success: true,
            data: {
                wallPaths: result.wallPaths.map(wall => ({
                    id: wall.id,
                    lengthMetres: wall.lengthMetres,
                    confidenceScore: wall.confidenceScore,
                    polyline: {
                        totalLength: wall.polyline.totalLength,
                        strokeWidth: wall.polyline.strokeWidth,
                        color: wall.polyline.color,
                        layer: wall.polyline.layer,
                        segmentCount: wall.polyline.segments.length,
                    },
                    markers: wall.markers,
                    debugInfo: wall.debugInfo,
                })),
                scaleInfo: result.scaleInfo,
                pageWidth: result.pageWidth,
                pageHeight: result.pageHeight,
                totalDimensionLinesFound: result.totalDimensionLinesFound,
            },
            debug: {
                logLines: result.debugLog.length,
                log: result.debugLog,
            },
        });
    }
    catch (error) {
        console.error('[API] Error:', error);
        return res.status(500).json({
            error: 'Detection failed',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
/**
 * POST /api/set-scale
 * Manually set the scale if automatic detection failed
 *
 * Request:
 *   - wallPathsJson: JSON string of wall paths from previous detection
 *   - metresPerUnit: Scale factor to apply
 *
 * Response:
 *   - Updated wallPaths with new lengths and markers
 */
app.post('/api/set-scale', express_1.default.json(), (req, res) => {
    try {
        const { wallPathsJson, metresPerUnit } = req.body;
        if (!wallPathsJson || typeof metresPerUnit !== 'number') {
            return res.status(400).json({ error: 'Missing wallPathsJson or metresPerUnit' });
        }
        const wallPaths = JSON.parse(wallPathsJson);
        // Recalculate lengths and markers
        const markerGen = new markerGenerator_1.MarkerGenerator();
        const updatedWalls = wallPaths.map((wall) => ({
            ...wall,
            lengthMetres: wall.polyline.totalLength * metresPerUnit,
            markers: markerGen.generateMarkersForWall(wall, metresPerUnit),
        }));
        return res.json({
            success: true,
            wallPaths: updatedWalls,
        });
    }
    catch (error) {
        console.error('[API] Error in set-scale:', error);
        return res.status(500).json({
            error: 'Scale update failed',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
/**
 * GET /api/export-markers/:format
 * Export markers in various formats (CSV, JSON, etc.)
 *
 * Query:
 *   - wallPathsJson: JSON string of wall paths
 */
app.get('/api/export-markers/:format', (req, res) => {
    try {
        const { format } = req.params;
        const wallPathsJson = req.query.wallPathsJson;
        if (!wallPathsJson) {
            return res.status(400).json({ error: 'Missing wallPathsJson query parameter' });
        }
        const wallPaths = JSON.parse(wallPathsJson);
        if (format === 'csv') {
            const csv = markerGenerator_1.MarkerGenerator.exportMarkersToCSV(wallPaths);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="markers.csv"');
            return res.send(csv);
        }
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename="markers.json"');
            return res.json({
                exportedAt: new Date().toISOString(),
                markers: wallPaths.flatMap((wall) => wall.markers.map((marker) => ({
                    wallId: wall.id,
                    chainage: marker.chainageMetres,
                    position: marker.position,
                }))),
            });
        }
        return res.status(400).json({ error: `Unsupported format: ${format}` });
    }
    catch (error) {
        console.error('[API] Error in export-markers:', error);
        return res.status(500).json({
            error: 'Export failed',
            message: error instanceof Error ? error.message : String(error),
        });
    }
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Wall Detector API listening on port ${PORT}`);
    console.log(`POST /api/detect-walls - Upload PDF for wall detection`);
    console.log(`POST /api/set-scale - Manually set scale`);
    console.log(`GET /api/export-markers/:format - Export markers (csv/json)`);
});
//# sourceMappingURL=server.js.map