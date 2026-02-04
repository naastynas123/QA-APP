/**
 * Comprehensive Test Harness
 * Runs synthetic tests, validates detection, and reports metrics
 */

import { SyntheticTestGenerator, SyntheticTestCase } from './syntheticTestGenerator';
import { RobustWallDetectionPipeline, RobustDetectionConfig } from './robustDetectionPipeline';
import { EvaluationHarness, DetectionMetrics, DetectedWall, DetectedLabel } from './evaluationHarness';

export interface TestSuiteResult {
  testCases: Array<{
    name: string;
    description: string;
    metrics: DetectionMetrics;
    wallsDetected: number;
    labelsGenerated: number;
    passed: boolean;
    notes: string[];
  }>;
  summary: {
    totalTests: number;
    passedTests: number;
    avgPrecision: number;
    avgRecall: number;
    avgF1: number;
  };
}

export class WallDetectionTestHarness {
  private pipeline: RobustWallDetectionPipeline;
  private evaluator: EvaluationHarness;
  private results: TestSuiteResult;

  constructor(config: RobustDetectionConfig = {}) {
    this.pipeline = new RobustWallDetectionPipeline(config);
    this.evaluator = new EvaluationHarness();
    this.results = {
      testCases: [],
      summary: {
        totalTests: 0,
        passedTests: 0,
        avgPrecision: 0,
        avgRecall: 0,
        avgF1: 0,
      },
    };
  }

  /**
   * Run all synthetic test cases
   */
  async runAllTests(): Promise<TestSuiteResult> {
    console.log('[TestHarness] Starting comprehensive test suite');
    this.results = {
      testCases: [],
      summary: { totalTests: 0, passedTests: 0, avgPrecision: 0, avgRecall: 0, avgF1: 0 },
    };

    // Generate test cases
    const testCases = [
      SyntheticTestGenerator.generateSimpleLShaped(),
      SyntheticTestGenerator.generateDoubleLineWithNoise(),
      SyntheticTestGenerator.generateComplexAngled(),
    ];

    // Run each test
    for (const testCase of testCases) {
      await this.runSingleTest(testCase);
    }

    // Compute summary
    this.computeSummary();

    console.log('[TestHarness] Test suite complete');
    console.log('[TestHarness] Summary:', this.results.summary);

    return this.results;
  }

  /**
   * Run a single test case
   */
  private async runSingleTest(testCase: SyntheticTestCase): Promise<void> {
    console.log(`[TestHarness] Running test: ${testCase.name}`);

    const notes: string[] = [testCase.description];

    try {
      // Step 1: Run detection
      const detectionResult = await this.pipeline.detectFromCanvas(
        testCase.canvas,
        testCase.metresPerPixel,
        { enableDebugOverlay: false }
      );

      const wallsDetected = detectionResult.wallPaths.length;
      notes.push(`Walls detected: ${wallsDetected}`);

      // Step 2: Convert to evaluation format
      const detectedWalls: DetectedWall[] = detectionResult.wallPaths.map(wall => {
        // Convert wall polyline to point array
        const points: Point[] = [];
        for (const seg of wall.polyline.segments) {
          if (points.length === 0) points.push(seg.start);
          points.push(seg.end);
        }

        return {
          id: wall.id,
          polyline: points,
          lengthMetres: wall.lengthMetres,
        };
      });

      // Step 3: Evaluate walls
      const metrics = this.evaluator.evaluateWallDetection(
        testCase.groundTruthWalls,
        detectedWalls
      );

      notes.push(`Precision: ${(metrics.precision * 100).toFixed(1)}%`);
      notes.push(`Recall: ${(metrics.recall * 100).toFixed(1)}%`);
      notes.push(`F1 Score: ${metrics.f1Score.toFixed(3)}`);
      notes.push(`Centerline error: ${metrics.avgCenterlineError.toFixed(1)} px`);

      // Step 4: Evaluate labels
      const detectedLabels: DetectedLabel[] = [];
      for (const wall of detectionResult.wallPaths) {
        for (const marker of wall.markers || []) {
          detectedLabels.push({
            id: marker.id,
            wallId: wall.id,
            chainage: marker.chainageMetres,
            position: marker.position,
          });
        }
      }

      const labelMetrics = this.evaluator.evaluateLabelSpacing(
        testCase.groundTruthLabels,
        detectedLabels
      );

      metrics.avgLabelSpacingError = labelMetrics.avgError;
      metrics.maxLabelSpacingError = labelMetrics.maxError;
      metrics.labelAccuracy = labelMetrics.accuracy;

      notes.push(`Label spacing error: ${labelMetrics.avgError.toFixed(2)} m`);
      notes.push(`Label accuracy: ${labelMetrics.accuracy.toFixed(1)}%`);

      // Step 5: Determine pass/fail
      const passed = metrics.f1Score >= 0.7 && labelMetrics.accuracy >= 80;

      this.results.testCases.push({
        name: testCase.name,
        description: testCase.description,
        metrics,
        wallsDetected,
        labelsGenerated: detectedLabels.length,
        passed,
        notes,
      });

      console.log(`[TestHarness] ${testCase.name}: ${passed ? 'PASSED' : 'FAILED'}`);
    } catch (error) {
      console.error(`[TestHarness] Test failed:`, error);

      this.results.testCases.push({
        name: testCase.name,
        description: testCase.description,
        metrics: {
          precision: 0,
          recall: 0,
          f1Score: 0,
          wallCount: { groundTruth: 0, detected: 0, matched: 0 },
          avgLabelSpacingError: 0,
          maxLabelSpacingError: 0,
          labelAccuracy: 0,
          avgCenterlineError: 0,
          maxCenterlineError: 0,
        },
        wallsDetected: 0,
        labelsGenerated: 0,
        passed: false,
        notes: [`Error: ${error}`],
      });
    }
  }

  /**
   * Compute summary statistics
   */
  private computeSummary(): void {
    const results = this.results.testCases;

    if (results.length === 0) {
      return;
    }

    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;

    const precisions = results.map(r => r.metrics.precision);
    const recalls = results.map(r => r.metrics.recall);
    const f1Scores = results.map(r => r.metrics.f1Score);

    const avgPrecision = precisions.reduce((a, b) => a + b, 0) / precisions.length;
    const avgRecall = recalls.reduce((a, b) => a + b, 0) / recalls.length;
    const avgF1 = f1Scores.reduce((a, b) => a + b, 0) / f1Scores.length;

    this.results.summary = {
      totalTests,
      passedTests,
      avgPrecision,
      avgRecall,
      avgF1,
    };
  }

  /**
   * Export test results as JSON
   */
  exportResults(): TestSuiteResult {
    return this.results;
  }

  /**
   * Generate a formatted report
   */
  generateReport(): string {
    const lines: string[] = [];

    lines.push('='.repeat(70));
    lines.push('WALL DETECTION TEST HARNESS - COMPREHENSIVE REPORT');
    lines.push('='.repeat(70));
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('-'.repeat(70));
    lines.push(`Total Tests:     ${this.results.summary.totalTests}`);
    lines.push(`Passed Tests:    ${this.results.summary.passedTests} / ${this.results.summary.totalTests}`);
    lines.push(`Pass Rate:       ${((this.results.summary.passedTests / this.results.summary.totalTests) * 100).toFixed(1)}%`);
    lines.push(`Average Precision: ${(this.results.summary.avgPrecision * 100).toFixed(1)}%`);
    lines.push(`Average Recall:    ${(this.results.summary.avgRecall * 100).toFixed(1)}%`);
    lines.push(`Average F1 Score:  ${this.results.summary.avgF1.toFixed(3)}`);
    lines.push('');

    // Test Cases
    lines.push('TEST CASES');
    lines.push('-'.repeat(70));

    for (const testCase of this.results.testCases) {
      lines.push(`\n[${testCase.passed ? '✓ PASS' : '✗ FAIL'}] ${testCase.name}`);
      lines.push(`  ${testCase.description}`);
      lines.push(`  Walls: ${testCase.metrics.wallCount.detected}/${testCase.metrics.wallCount.groundTruth} detected`);
      lines.push(`  Labels: ${testCase.labelsGenerated} generated`);
      lines.push(`  Precision: ${(testCase.metrics.precision * 100).toFixed(1)}%`);
      lines.push(`  Recall: ${(testCase.metrics.recall * 100).toFixed(1)}%`);
      lines.push(`  F1 Score: ${testCase.metrics.f1Score.toFixed(3)}`);
      lines.push(`  Centerline Error: ${testCase.metrics.avgCenterlineError.toFixed(1)} px`);
      lines.push(`  Label Spacing Error: ${testCase.metrics.avgLabelSpacingError.toFixed(2)} m`);
      lines.push(`  Label Accuracy: ${testCase.metrics.labelAccuracy.toFixed(1)}%`);

      if (testCase.notes.length > 0) {
        lines.push('  Notes:');
        for (const note of testCase.notes) {
          lines.push(`    - ${note}`);
        }
      }
    }

    lines.push('');
    lines.push('='.repeat(70));

    return lines.join('\n');
  }
}

// Type definitions for test imports
interface Point {
  x: number;
  y: number;
}
