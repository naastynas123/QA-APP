/**
 * Scoring Engine
 * Computes confidence scores for wall paths and generates debug reports
 */

import { WallPath, DebugInfo, Polyline } from './types';
import { GeometryUtils } from './geometryUtils';

export interface ScoringConfig {
  minLengthMetres: number; // Walls shorter than this get low scores
  maxLengthMetres: number; // Unusually long walls get penalized
  idealStrokeWidth: number; // Best stroke width for walls (typically 0.5-2)
  minSegmentsForGoodScore: number; // Polylines with fewer segments get penalized
}

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  minLengthMetres: 0.5,
  maxLengthMetres: 100,
  idealStrokeWidth: 1.0,
  minSegmentsForGoodScore: 3,
};

export class ScoringEngine {
  private config: ScoringConfig;

  constructor(config: Partial<ScoringConfig> = {}) {
    this.config = { ...DEFAULT_SCORING_CONFIG, ...config };
  }

  /**
   * Compute confidence score for a wall path
   * Returns a value between 0 and 1
   */
  computeConfidenceScore(wall: WallPath): number {
    let score = 0.5; // Base score

    // Factor 1: Length
    if (wall.lengthMetres > 0) {
      if (wall.lengthMetres < this.config.minLengthMetres) {
        score -= 0.2; // Penalize too-short walls
      } else if (wall.lengthMetres > this.config.maxLengthMetres) {
        score -= 0.15; // Slight penalty for unusually long walls
      } else {
        score += 0.2; // Good length range
      }
    }

    // Factor 2: Stroke width
    const strokeDiff = Math.abs(wall.polyline.strokeWidth - this.config.idealStrokeWidth);
    const strokePenalty = Math.min(0.15, strokeDiff * 0.05);
    score -= strokePenalty;

    // Factor 3: Number of segments (connectivity)
    if (wall.polyline.segments.length >= this.config.minSegmentsForGoodScore) {
      score += 0.15;
    } else if (wall.polyline.segments.length === 1) {
      score -= 0.1; // Single-segment walls are less likely to be real walls
    }

    // Factor 4: Polyline continuity
    const continuityPenalty = this.assessContinuity(wall.polyline);
    score -= continuityPenalty;

    // Clamp score to [0, 1]
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess whether segments form a continuous path
   */
  private assessContinuity(polyline: Polyline): number {
    let penalty = 0;
    const proximityThreshold = 10; // Acceptable gap between segments

    for (let i = 0; i < polyline.segments.length - 1; i++) {
      const gap = GeometryUtils.distance(
        polyline.segments[i].end,
        polyline.segments[i + 1].start
      );

      if (gap > proximityThreshold) {
        penalty += 0.05;
      }
    }

    return Math.min(penalty, 0.2); // Cap at 0.2
  }

  /**
   * Assess similarity to typical wall characteristics
   */
  assessWallCharacteristics(wall: WallPath): {
    lengthScore: number;
    strokeScore: number;
    connectivityScore: number;
    overall: number;
  } {
    const lengthScore = this.scoreLengthCharacteristic(wall.lengthMetres);
    const strokeScore = this.scoreStrokeCharacteristic(wall.polyline.strokeWidth);
    const connectivityScore = this.scoreConnectivity(wall.polyline);

    return {
      lengthScore,
      strokeScore,
      connectivityScore,
      overall: (lengthScore + strokeScore + connectivityScore) / 3,
    };
  }

  private scoreLengthCharacteristic(lengthMetres: number): number {
    // Ideal walls are 1-50m
    if (lengthMetres <= 0) return 0; // Unknown length
    if (lengthMetres < 0.5) return 0.2;
    if (lengthMetres < 1) return 0.5;
    if (lengthMetres < 50) return 1.0;
    if (lengthMetres < 100) return 0.8;
    return 0.4;
  }

  private scoreStrokeCharacteristic(strokeWidth: number): number {
    // Ideal walls have stroke width 0.5-2
    if (strokeWidth < 0.3) return 0.2;
    if (strokeWidth < 0.5) return 0.6;
    if (strokeWidth < 2.0) return 1.0;
    if (strokeWidth < 5.0) return 0.7;
    return 0.2;
  }

  private scoreConnectivity(polyline: Polyline): number {
    if (polyline.segments.length < 1) return 0;
    if (polyline.segments.length < 3) return 0.5;
    return 1.0;
  }

  /**
   * Generate detailed debug information
   */
  generateDebugInfo(
    wall: WallPath,
    totalSegmentsAnalyzed: number,
    discardedStats: { tooThin: number; tooShort: number; other: number }
  ): DebugInfo {
    const characteristics = this.assessWallCharacteristics(wall);

    return {
      totalSegmentsAnalyzed,
      segmentsDiscarded: discardedStats,
      segmentsKept: wall.polyline.segments.length,
      connectionIssues: this.identifyConnectionIssues(wall.polyline),
      scaleInferenceStatus:
        wall.lengthMetres > 0
          ? `${wall.lengthMetres.toFixed(2)} m (known)`
          : 'Unknown (scale not detected)',
      notes: [
        `Confidence score: ${wall.confidenceScore.toFixed(3)}`,
        `Length score: ${characteristics.lengthScore.toFixed(2)}, Stroke score: ${characteristics.strokeScore.toFixed(2)}, Connectivity: ${characteristics.connectivityScore.toFixed(2)}`,
        `Polyline formed from ${wall.polyline.segments.length} segments`,
        `Stroke width: ${wall.polyline.strokeWidth.toFixed(2)} units`,
      ],
    };
  }

  private identifyConnectionIssues(polyline: Polyline): string[] {
    const issues: string[] = [];
    const proximityThreshold = 10;

    for (let i = 0; i < polyline.segments.length - 1; i++) {
      const gap = GeometryUtils.distance(
        polyline.segments[i].end,
        polyline.segments[i + 1].start
      );

      if (gap > proximityThreshold) {
        issues.push(`Gap of ${gap.toFixed(2)} units between segment ${i} and ${i + 1}`);
      }
    }

    return issues;
  }

  /**
   * Generate a detailed report for all walls
   */
  generateReport(wallPaths: WallPath[]): string {
    let report = '=== WALL DETECTION REPORT ===\n\n';
    report += `Total walls detected: ${wallPaths.length}\n`;
    report += `Average confidence: ${(wallPaths.reduce((s, w) => s + w.confidenceScore, 0) / wallPaths.length).toFixed(3)}\n\n`;

    for (const wall of wallPaths) {
      report += `--- ${wall.id.substring(0, 8)} ---\n`;
      report += `Length: ${wall.lengthMetres > 0 ? wall.lengthMetres.toFixed(2) + ' m' : 'unknown'}\n`;
      report += `Confidence: ${wall.confidenceScore.toFixed(3)}\n`;
      report += `Segments: ${wall.polyline.segments.length}\n`;
      report += `Stroke width: ${wall.polyline.strokeWidth.toFixed(2)}\n`;
      report += `Markers: ${wall.markers.length}\n`;

      if (wall.debugInfo.connectionIssues.length > 0) {
        report += `Issues:\n`;
        for (const issue of wall.debugInfo.connectionIssues) {
          report += `  - ${issue}\n`;
        }
      }

      report += '\n';
    }

    return report;
  }
}
