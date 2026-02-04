/**
 * Evaluation Harness for Wall Detection
 * Validates detection accuracy against ground truth, computes metrics
 */

import { Point, Segment, Polyline } from './types';

export interface GroundTruthWall {
  id: string;
  polyline: Point[]; // Sequence of points defining the wall centerline
  lengthMetres: number;
}

export interface DetectedWall {
  id: string;
  polyline: Point[]; // Detected centerline
  lengthMetres: number;
}

export interface LabelSpacingGroundTruth {
  wallId: string;
  spacingMetres: number; // Expected spacing
  numLabels: number; // How many labels should exist
}

export interface DetectedLabel {
  id: string;
  wallId: string;
  chainage: number; // Distance from wall start
  position: Point;
}

/**
 * Evaluation metrics
 */
export interface DetectionMetrics {
  // Wall detection
  precision: number; // TP / (TP + FP)
  recall: number; // TP / (TP + FN)
  f1Score: number;
  wallCount: {
    groundTruth: number;
    detected: number;
    matched: number;
  };

  // Label spacing
  avgLabelSpacingError: number; // metres
  maxLabelSpacingError: number;
  labelAccuracy: number; // % of labels within tolerance

  // Geometric accuracy
  avgCenterlineError: number; // pixels, mean distance from detected to ground truth
  maxCenterlineError: number;
}

export class EvaluationHarness {
  private distanceThresholdPixels = 50; // For matching detected walls to ground truth
  private labelToleranceMetres = 0.5; // Allow ±0.5m variance in label spacing

  /**
   * Compare detected walls against ground truth
   */
  evaluateWallDetection(
    groundTruthWalls: GroundTruthWall[],
    detectedWalls: DetectedWall[]
  ): DetectionMetrics {
    // Match detected walls to ground truth walls
    const matches = this.matchWallsToGroundTruth(groundTruthWalls, detectedWalls);

    const tp = matches.filter(m => m.groundTruthId !== null).length; // True positives
    const fp = detectedWalls.length - tp; // False positives
    const fn = groundTruthWalls.length - tp; // False negatives

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const f1Score = 2 * ((precision * recall) / (precision + recall)) || 0;

    // Compute centerline errors for matched walls
    const centerlineErrors = this.computeCenterlineErrors(matches, groundTruthWalls, detectedWalls);

    return {
      precision,
      recall,
      f1Score,
      wallCount: {
        groundTruth: groundTruthWalls.length,
        detected: detectedWalls.length,
        matched: tp,
      },
      avgLabelSpacingError: 0, // Set by label evaluation
      maxLabelSpacingError: 0,
      labelAccuracy: 0,
      avgCenterlineError: centerlineErrors.avg,
      maxCenterlineError: centerlineErrors.max,
    };
  }

  /**
   * Evaluate label spacing accuracy
   */
  evaluateLabelSpacing(
    groundTruthLabels: LabelSpacingGroundTruth[],
    detectedLabels: DetectedLabel[]
  ): {
    avgError: number;
    maxError: number;
    accuracy: number; // % within tolerance
  } {
    const errors: number[] = [];

    for (const gtLabel of groundTruthLabels) {
      const wallLabels = detectedLabels.filter(l => l.wallId === gtLabel.wallId);

      if (wallLabels.length === 0) continue;

      // Sort by chainage
      wallLabels.sort((a, b) => a.chainage - b.chainage);

      // Compute spacing between consecutive labels
      for (let i = 0; i < wallLabels.length - 1; i++) {
        const spacing = wallLabels[i + 1].chainage - wallLabels[i].chainage;
        const error = Math.abs(spacing - gtLabel.spacingMetres);
        errors.push(error);
      }
    }

    if (errors.length === 0) {
      return { avgError: 0, maxError: 0, accuracy: 0 };
    }

    const avgError = errors.reduce((a, b) => a + b, 0) / errors.length;
    const maxError = Math.max(...errors);
    const withinTol = errors.filter(e => e <= this.labelToleranceMetres).length;
    const accuracy = (withinTol / errors.length) * 100;

    return { avgError, maxError, accuracy };
  }

  /**
   * Match detected walls to ground truth walls using a greedy approach
   */
  private matchWallsToGroundTruth(
    groundTruthWalls: GroundTruthWall[],
    detectedWalls: DetectedWall[]
  ): Array<{ groundTruthId: string | null; detectedId: string | null }> {
    const matches: Array<{ groundTruthId: string | null; detectedId: string | null }> = [];
    const usedDetected = new Set<string>();

    for (const gtWall of groundTruthWalls) {
      let bestMatch: string | null = null;
      let bestError = this.distanceThresholdPixels;

      for (const detWall of detectedWalls) {
        if (usedDetected.has(detWall.id)) continue;

        const error = this.computePolylinesHausdorffDistance(gtWall.polyline, detWall.polyline);

        if (error < bestError) {
          bestError = error;
          bestMatch = detWall.id;
        }
      }

      if (bestMatch) {
        matches.push({ groundTruthId: gtWall.id, detectedId: bestMatch });
        usedDetected.add(bestMatch);
      } else {
        matches.push({ groundTruthId: gtWall.id, detectedId: null });
      }
    }

    // Add unmatched detected walls
    for (const detWall of detectedWalls) {
      if (!usedDetected.has(detWall.id)) {
        matches.push({ groundTruthId: null, detectedId: detWall.id });
      }
    }

    return matches;
  }

  /**
   * Compute Hausdorff distance between two polylines
   * (max distance from any point on line1 to nearest point on line2)
   */
  private computePolylinesHausdorffDistance(line1: Point[], line2: Point[]): number {
    let maxDist = 0;

    for (const p1 of line1) {
      let minDistToLine2 = Infinity;

      for (let i = 0; i < line2.length - 1; i++) {
        const dist = this.distancePointToLineSegment(p1, line2[i], line2[i + 1]);
        minDistToLine2 = Math.min(minDistToLine2, dist);
      }

      maxDist = Math.max(maxDist, minDistToLine2);
    }

    return maxDist;
  }

  /**
   * Compute centerline errors (distance between ground truth and detected polylines)
   */
  private computeCenterlineErrors(
    matches: Array<{ groundTruthId: string | null; detectedId: string | null }>,
    groundTruthWalls: GroundTruthWall[],
    detectedWalls: DetectedWall[]
  ): { avg: number; max: number } {
    const errors: number[] = [];

    for (const match of matches) {
      if (!match.groundTruthId || !match.detectedId) continue;

      const gtWall = groundTruthWalls.find(w => w.id === match.groundTruthId)!;
      const detWall = detectedWalls.find(w => w.id === match.detectedId)!;

      const error = this.computePolylinesHausdorffDistance(gtWall.polyline, detWall.polyline);
      errors.push(error);
    }

    if (errors.length === 0) return { avg: 0, max: 0 };

    const avg = errors.reduce((a, b) => a + b, 0) / errors.length;
    const max = Math.max(...errors);

    return { avg, max };
  }

  /**
   * Distance from point to line segment
   */
  private distancePointToLineSegment(p: Point, a: Point, b: Point): number {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy);
    t = Math.max(0, Math.min(1, t));

    const closest = {
      x: a.x + t * dx,
      y: a.y + t * dy,
    };

    return this.distancePointToPoint(p, closest);
  }

  private distancePointToPoint(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
