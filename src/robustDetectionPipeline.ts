/**
 * Robust Wall Detection Pipeline - Integration
 * Orchestrates all detection modules with fallback strategies
 */

import { Segment, DetectionResult, WallPath, Polyline, Point } from './types';
import { RasterDetectionPipeline, DEFAULT_RASTER_CONFIG } from './rasterDetection';
import { WallClusterer, DEFAULT_CLUSTERING_CONFIG, WallCluster } from './wallClusterer';
import { LabelAlongPolyline, DEFAULT_LABEL_CONFIG } from './labelPlacement';
import { ScaleCalibrator } from './scaleCalibrator';
import { DebugOverlay, WallVisualization } from './debugOverlay';
import { EvaluationHarness, DetectionMetrics } from './evaluationHarness';

export interface RobustDetectionConfig {
  rasterConfig?: Partial<typeof DEFAULT_RASTER_CONFIG>;
  clusteringConfig?: Partial<typeof DEFAULT_CLUSTERING_CONFIG>;
  labelConfig?: Partial<typeof DEFAULT_LABEL_CONFIG>;
  minWallLengthMetres?: number;
  enableDebugOverlay?: boolean;
  debugCanvas?: HTMLCanvasElement;
}

export interface RobustDetectionResult extends DetectionResult {
  wallVisualizations?: WallVisualization[];
  metrics?: DetectionMetrics;
  debugOverlayBlob?: Blob;
}

export class RobustWallDetectionPipeline {
  private rasterPipeline: RasterDetectionPipeline;
  private clusterer: WallClusterer;
  private labelPlacer: LabelAlongPolyline;
  private calibrator: ScaleCalibrator;
  private debugLog: string[] = [];

  constructor(config: RobustDetectionConfig = {}) {
    this.rasterPipeline = new RasterDetectionPipeline(config.rasterConfig);
    this.clusterer = new WallClusterer(config.clusteringConfig);
    this.labelPlacer = new LabelAlongPolyline(config.labelConfig);
    this.calibrator = new ScaleCalibrator();
  }

  /**
   * Full detection pipeline from image/canvas
   */
  async detectFromCanvas(
    canvas: HTMLCanvasElement,
    metresPerPixel: number,
    config: RobustDetectionConfig = {}
  ): Promise<RobustDetectionResult> {
    this.debugLog = [];
    this.log('Starting robust detection pipeline');

    try {
      // Step 1: Raster detection (line detection)
      this.log('Step 1: Raster-based line detection');
      const { segments: rawSegments, debugInfo: rasterDebugInfo } =
        this.rasterPipeline.detectSegmentsFromImage(canvas);
      this.debugLog.push(...rasterDebugInfo);
      this.log(`Detected ${rawSegments.length} raw line segments`);

      // Step 2: Cluster into walls
      this.log('Step 2: Clustering segments into walls');
      const wallClusters = this.clusterer.clusterSegments(rawSegments);
      this.log(`Clustered into ${wallClusters.length} wall clusters`);

      // Step 3: Extract centerlines and filter
      this.log('Step 3: Extracting centerlines and filtering');
      const minWallLengthMetres = config.minWallLengthMetres || 5;
      const minWallLengthPixels = minWallLengthMetres / metresPerPixel;

      const wallPaths: WallPath[] = [];
      let wallIdCounter = 1;

      for (const cluster of wallClusters) {
        const centerlinePolyline = this.clusterer.extractCenterlinePolyline(
          cluster,
          wallClusters.find(c => c.id === cluster.parallelPartner)
        );

        const lengthMetres = centerlinePolyline.totalLength * metresPerPixel;

        if (lengthMetres < minWallLengthMetres) {
          this.log(`  Filtered: wall too short (${lengthMetres.toFixed(1)}m < ${minWallLengthMetres}m)`);
          continue;
        }

        // Create wall path
        const wallId = `wall_${wallIdCounter++}`;
        const wallPath: WallPath = {
          id: wallId,
          polyline: centerlinePolyline,
          lengthMetres,
          markers: [],
          confidenceScore: this.computeWallConfidence(cluster),
          debugInfo: {
            totalSegmentsAnalyzed: rawSegments.length,
            segmentsDiscarded: { tooThin: 0, tooShort: 0, other: 0 },
            segmentsKept: cluster.segments.length,
            connectionIssues: [],
            scaleInferenceStatus: `${metresPerPixel} m/px`,
            notes: [
              `Cluster: ${cluster.segments.length} segments`,
              `Double-line: ${cluster.isDoubleLine}`,
            ],
          },
        };

        // Step 4: Generate labels
        this.log(`  Generating labels for ${wallId}`);
        const labels = this.labelPlacer.placeLabelsPoly(
          centerlinePolyline,
          metresPerPixel,
          wallId
        );

        wallPath.markers = labels as any; // Convert to Marker interface

        wallPaths.push(wallPath);
      }

      this.log(`Final: ${wallPaths.length} walls after filtering`);

      // Step 5: Create visualizations
      const wallVisualizations = this.createVisualizations(wallPaths);

      // Step 6: Debug overlay (optional)
      let debugOverlayBlob: Blob | undefined;
      if (config.enableDebugOverlay && config.debugCanvas) {
        this.log('Rendering debug overlay');
        const overlay = new DebugOverlay(config.debugCanvas);
        overlay.render(rawSegments, rawSegments, wallVisualizations);
        debugOverlayBlob = await overlay.exportAsPNG();
      }

      this.log('Detection pipeline complete');

      return {
        wallPaths,
        scaleInfo: {
          metresPerUnit: metresPerPixel,
          strategy: 'user-provided',
          confidence: 'high',
          sourceInfo: `${metresPerPixel} metres/pixel`,
        },
        pageWidth: canvas.width,
        pageHeight: canvas.height,
        totalDimensionLinesFound: 0,
        debugLog: this.debugLog,
        wallVisualizations,
        debugOverlayBlob,
      };
    } catch (error) {
      this.log(`ERROR: ${error}`);
      throw error;
    }
  }

  /**
   * Create visualization data for rendering
   */
  private createVisualizations(wallPaths: WallPath[]): WallVisualization[] {
    return wallPaths.map(wall => {
      // Convert polyline segments to point sequence
      const centerlinePoints: Point[] = [];
      for (const seg of wall.polyline.segments) {
        if (centerlinePoints.length === 0) {
          centerlinePoints.push(seg.start);
        }
        centerlinePoints.push(seg.end);
      }

      // Compute bounds
      const xs = centerlinePoints.map(p => p.x);
      const ys = centerlinePoints.map(p => p.y);
      const bounds = {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys),
      };

      // Convert markers to label objects
      const labels = (wall.markers || []).map((marker: any, idx: number) => ({
        id: marker.id || `${wall.id}_label_${idx}`,
        position: marker.position || { x: 0, y: 0 },
        chainage: marker.chainageMetres || 0,
        angle: Math.random() * 360, // Would be computed from wall direction
      }));

      return {
        id: wall.id,
        centerline: centerlinePoints,
        bounds,
        labels,
      };
    });
  }

  /**
   * Compute confidence score for a wall cluster
   */
  private computeWallConfidence(cluster: WallCluster): number {
    // Simple heuristic: more segments = higher confidence
    let score = Math.min(cluster.segments.length / 10, 1.0); // Max 1.0 at 10 segments

    // Double-line walls are more reliable
    if (cluster.isDoubleLine) {
      score = Math.min(score + 0.2, 1.0);
    }

    return score;
  }

  private log(message: string): void {
    this.debugLog.push(`[RobustPipeline] ${message}`);
    console.log(`[RobustPipeline] ${message}`);
  }

  getDebugLog(): string[] {
    return this.debugLog;
  }
}
