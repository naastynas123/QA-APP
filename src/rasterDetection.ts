/**
 * Raster-based Wall Detection Pipeline
 * Handles preprocessing, line detection, and segment merging for scanned PDFs/images
 */

import { Point, Segment } from './types';

export interface RasterDetectionConfig {
  // Preprocessing
  adaptiveThresholdBlockSize: number; // Odd number, typically 11-31
  adaptiveThresholdC: number; // Constant subtracted from mean, typically 2-10
  morphologyKernel: number; // Size of morphology kernel (3, 5, 7)
  morphologyIterations: number;

  // Line detection
  cannyThreshold1: number;
  cannyThreshold2: number;
  houghMinLineLength: number; // Minimum line length in pixels
  houghMaxLineGap: number; // Maximum gap between collinear segments
  houghThreshold: number; // Votes threshold

  // Segment merging
  collinearityAngleTol: number; // degrees
  distanceTol: number; // pixels, max gap to bridge

  // Wall filtering
  minWallLengthPixels: number;
}

export const DEFAULT_RASTER_CONFIG: RasterDetectionConfig = {
  adaptiveThresholdBlockSize: 15,
  adaptiveThresholdC: 5,
  morphologyKernel: 3,
  morphologyIterations: 1,
  cannyThreshold1: 50,
  cannyThreshold2: 150,
  houghMinLineLength: 30,
  houghMaxLineGap: 15,
  houghThreshold: 50,
  collinearityAngleTol: 5,
  distanceTol: 10,
  minWallLengthPixels: 100,
};

/**
 * Simulated image processing pipeline
 * In production, use OpenCV.js or canvas-based image processing
 */
export class RasterDetectionPipeline {
  private config: RasterDetectionConfig;
  private debugLog: string[] = [];

  constructor(config: Partial<RasterDetectionConfig> = {}) {
    this.config = { ...DEFAULT_RASTER_CONFIG, ...config };
  }

  /**
   * Full pipeline: preprocess image, detect lines, merge segments
   */
  detectSegmentsFromImage(
    imageData: ImageData | Canvas
  ): {
    segments: Segment[];
    debugInfo: string[];
  } {
    this.debugLog = [];
    this.log('Starting raster detection pipeline');

    try {
      // Step 1: Preprocess
      const preprocessed = this.preprocessImage(imageData);
      this.log(`Preprocessing complete: ${preprocessed.width}x${preprocessed.height}`);

      // Step 2: Detect edges
      const edges = this.detectEdges(preprocessed);
      this.log('Edge detection complete');

      // Step 3: Detect line segments via Hough transform
      const rawSegments = this.detectLineSegments(edges);
      this.log(`Detected ${rawSegments.length} raw line segments`);

      // Step 4: Merge collinear segments
      const mergedSegments = this.mergeCollinearSegments(rawSegments);
      this.log(`Merged to ${mergedSegments.length} segments`);

      // Step 5: Join gaps
      const joinedSegments = this.joinGaps(mergedSegments);
      this.log(`After gap joining: ${joinedSegments.length} segments`);

      return {
        segments: joinedSegments,
        debugInfo: this.debugLog,
      };
    } catch (error) {
      this.log(`ERROR: ${error}`);
      throw error;
    }
  }

  /**
   * Preprocess image: grayscale, adaptive threshold, morphology
   */
  private preprocessImage(
    imageData: ImageData | Canvas
  ): {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  } {
    // In production with OpenCV.js:
    // let src = cv.imread(canvas);
    // let gray = new cv.Mat();
    // cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    // let adaptive = new cv.Mat();
    // cv.adaptiveThreshold(gray, adaptive, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY, this.config.adaptiveThresholdBlockSize, this.config.adaptiveThresholdC);
    // let kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(this.config.morphologyKernel, this.config.morphologyKernel));
    // cv.morphologyEx(adaptive, adaptive, cv.MORPH_CLOSE, kernel, new cv.Point(-1,-1), this.config.morphologyIterations);

    // For now, return simulated preprocessed data
    const canvas = imageData instanceof HTMLCanvasElement ? imageData : null;
    if (!canvas) {
      throw new Error('Canvas required for raster detection');
    }

    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8ClampedArray(canvas.width * canvas.height),
    };
  }

  /**
   * Detect edges using Canny edge detector
   */
  private detectEdges(
    preprocessed: { width: number; height: number; data: Uint8ClampedArray }
  ): { width: number; height: number; data: Uint8ClampedArray } {
    // In production with OpenCV.js:
    // let edges = new cv.Mat();
    // cv.Canny(preprocessed, edges, this.config.cannyThreshold1, this.config.cannyThreshold2);

    return preprocessed; // Simulated
  }

  /**
   * Detect line segments using probabilistic Hough transform
   */
  private detectLineSegments(edges: {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }): Segment[] {
    // In production with OpenCV.js:
    // let lines = new cv.Mat();
    // cv.HoughLinesP(edges, lines, 1, Math.PI/180, this.config.houghThreshold,
    //                this.config.houghMinLineLength, this.config.houghMaxLineGap);
    // Then convert to Segment array

    // Simulated: return empty array (would be populated by actual OpenCV)
    return [];
  }

  /**
   * Merge segments that are collinear (lie on same line)
   */
  private mergeCollinearSegments(segments: Segment[]): Segment[] {
    if (segments.length === 0) return [];

    const merged: Segment[] = [];
    const used = new Set<number>();

    for (let i = 0; i < segments.length; i++) {
      if (used.has(i)) continue;

      let currentSeg = segments[i];
      let merged_any = true;

      // Keep merging collinear segments
      while (merged_any) {
        merged_any = false;

        for (let j = i + 1; j < segments.length; j++) {
          if (used.has(j)) continue;

          const candidate = segments[j];
          const marge = this.tryMergeSegments(currentSeg, candidate);

          if (marge) {
            currentSeg = marge;
            used.add(j);
            merged_any = true;
            break; // Restart search with merged segment
          }
        }
      }

      merged.push(currentSeg);
      used.add(i);
    }

    return merged;
  }

  /**
   * Try to merge two segments if they are collinear
   */
  private tryMergeSegments(seg1: Segment, seg2: Segment): Segment | null {
    // Check if collinear within tolerance
    if (!this.isCollinear(seg1, seg2)) return null;

    // Check if endpoints are close enough to bridge
    const dist1 = this.distancePointToPoint(seg1.end, seg2.start);
    const dist2 = this.distancePointToPoint(seg1.end, seg2.end);
    const dist3 = this.distancePointToPoint(seg2.start, seg1.start);
    const minDist = Math.min(dist1, dist2, dist3);

    if (minDist > this.config.distanceTol) return null;

    // Merge: find overall start and end
    const points = [seg1.start, seg1.end, seg2.start, seg2.end];
    let start = points[0];
    let end = points[0];

    for (const p of points) {
      if (this.distancePointToPoint(p, start) > this.distancePointToPoint(p, end)) {
        start = p;
      }
    }

    for (const p of points) {
      if (this.distancePointToPoint(p, end) < this.distancePointToPoint(p, start)) {
        end = p;
      }
    }

    return {
      start,
      end,
      strokeWidth: (seg1.strokeWidth + seg2.strokeWidth) / 2,
      color: seg1.color || seg2.color,
      layer: seg1.layer || seg2.layer,
    };
  }

  /**
   * Check if two segments are collinear
   */
  private isCollinear(seg1: Segment, seg2: Segment): boolean {
    const angle1 = this.getAngle(seg1.start, seg1.end);
    const angle2 = this.getAngle(seg2.start, seg2.end);
    const angleDiff = Math.abs(angle1 - angle2);

    // Allow wraparound at 180 degrees
    const normalizedDiff = Math.min(angleDiff, 180 - angleDiff);

    return normalizedDiff < this.config.collinearityAngleTol;
  }

  /**
   * Join nearby collinear segments to bridge small gaps
   */
  private joinGaps(segments: Segment[]): Segment[] {
    // Similar to mergeCollinearSegments but with relaxed distance tolerance
    return this.mergeCollinearSegments(segments);
  }

  private getAngle(p1: Point, p2: Point): number {
    return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180) / Math.PI;
  }

  private distancePointToPoint(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private log(message: string): void {
    this.debugLog.push(`[RasterDetection] ${message}`);
    console.log(`[RasterDetection] ${message}`);
  }

  getDebugLog(): string[] {
    return this.debugLog;
  }
}
