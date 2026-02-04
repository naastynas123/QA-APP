/**
 * Synthetic Test Case Generator
 * Creates synthetic wall drawings with known ground truth for validation
 */

import { Point, Segment } from './types';
import { GroundTruthWall, LabelSpacingGroundTruth } from './evaluationHarness';

export interface SyntheticTestCase {
  name: string;
  description: string;
  canvas: HTMLCanvasElement;
  groundTruthWalls: GroundTruthWall[];
  groundTruthLabels: LabelSpacingGroundTruth[];
  metresPerPixel: number;
}

export class SyntheticTestGenerator {
  /**
   * Generate Test Case 1: Simple L-shaped wall with clean lines
   */
  static generateSimpleLShaped(): SyntheticTestCase {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw L-shaped wall (two connected walls)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;

    // Vertical wall: (200, 100) to (200, 450)
    ctx.beginPath();
    ctx.moveTo(200, 100);
    ctx.lineTo(200, 450);
    ctx.stroke();

    // Horizontal wall: (200, 450) to (500, 450)
    ctx.beginPath();
    ctx.moveTo(200, 450);
    ctx.lineTo(500, 450);
    ctx.stroke();

    // Ground truth: two straight walls
    const metresPerPixel = 0.05; // 1 pixel = 5cm = 0.05m
    const wall1Length = 350 * metresPerPixel; // = 17.5m
    const wall2Length = 300 * metresPerPixel; // = 15m

    const groundTruthWalls: GroundTruthWall[] = [
      {
        id: 'wall_1',
        polyline: [
          { x: 200, y: 100 },
          { x: 200, y: 450 },
        ],
        lengthMetres: wall1Length,
      },
      {
        id: 'wall_2',
        polyline: [
          { x: 200, y: 450 },
          { x: 500, y: 450 },
        ],
        lengthMetres: wall2Length,
      },
    ];

    const groundTruthLabels: LabelSpacingGroundTruth[] = [
      { wallId: 'wall_1', spacingMetres: 5, numLabels: Math.floor(wall1Length / 5) },
      { wallId: 'wall_2', spacingMetres: 5, numLabels: Math.floor(wall2Length / 5) },
    ];

    return {
      name: 'Simple L-Shaped Wall',
      description: 'Clean L-shaped retaining wall for testing basic detection',
      canvas,
      groundTruthWalls,
      groundTruthLabels,
      metresPerPixel,
    };
  }

  /**
   * Generate Test Case 2: Double-line wall with noise and gaps
   */
  static generateDoubleLineWithNoise(): SyntheticTestCase {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw parallel double-line wall (typical wall outline)
    // Top line
    this.drawLineDashed(ctx, 150, 150, 800, 150, 3, [15, 10]); // Dashed to simulate noise
    // Bottom line (offset)
    this.drawLineDashed(ctx, 150, 180, 800, 180, 3, [15, 10]); // 30px offset

    // Add some noise (scattered dots)
    ctx.fillStyle = 'gray';
    for (let i = 0; i < 30; i++) {
      const x = 150 + Math.random() * 650;
      const y = 100 + Math.random() * 100;
      ctx.fillRect(x, y, 2, 2);
    }

    // Ground truth: single centerline between parallel lines
    const metresPerPixel = 0.05; // 1 pixel = 5cm
    const wallLength = 650 * metresPerPixel; // = 32.5m

    const centerlineY = 165; // Midpoint between top(150) and bottom(180)
    const groundTruthWalls: GroundTruthWall[] = [
      {
        id: 'wall_1',
        polyline: [
          { x: 150, y: centerlineY },
          { x: 800, y: centerlineY },
        ],
        lengthMetres: wallLength,
      },
    ];

    const groundTruthLabels: LabelSpacingGroundTruth[] = [
      { wallId: 'wall_1', spacingMetres: 5, numLabels: Math.floor(wallLength / 5) },
    ];

    return {
      name: 'Double-Line Wall with Noise',
      description: 'Parallel-line wall with gaps and noise to test robustness',
      canvas,
      groundTruthWalls,
      groundTruthLabels,
      metresPerPixel,
    };
  }

  /**
   * Generate Test Case 3: Complex multi-segment wall with angles
   */
  static generateComplexAngled(): SyntheticTestCase {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'black';
    ctx.lineWidth = 4;

    // Draw a zig-zag wall (like a property boundary)
    const points = [
      { x: 100, y: 100 },
      { x: 300, y: 150 },
      { x: 500, y: 120 },
      { x: 700, y: 250 },
      { x: 900, y: 200 },
    ];

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();

    // Add some random noise and hatching
    ctx.strokeStyle = 'lightgray';
    ctx.lineWidth = 1;
    for (let i = 0; i < 50; i++) {
      const x1 = 100 + Math.random() * 800;
      const y1 = 100 + Math.random() * 300;
      const x2 = x1 + (Math.random() - 0.5) * 30;
      const y2 = y1 + (Math.random() - 0.5) * 30;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Recompute centerline length
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      const dx = points[i + 1].x - points[i].x;
      const dy = points[i + 1].y - points[i].y;
      totalLength += Math.sqrt(dx * dx + dy * dy);
    }

    const metresPerPixel = 0.05;
    const wallLengthMetres = totalLength * metresPerPixel;

    const groundTruthWalls: GroundTruthWall[] = [
      {
        id: 'wall_1',
        polyline: points,
        lengthMetres: wallLengthMetres,
      },
    ];

    const groundTruthLabels: LabelSpacingGroundTruth[] = [
      { wallId: 'wall_1', spacingMetres: 5, numLabels: Math.floor(wallLengthMetres / 5) },
    ];

    return {
      name: 'Complex Angled Wall',
      description: 'Multi-segment wall with angles and surrounding noise',
      canvas,
      groundTruthWalls,
      groundTruthLabels,
      metresPerPixel,
    };
  }

  /**
   * Helper: Draw dashed line
   */
  private static drawLineDashed(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    width: number,
    dashPattern: number[]
  ): void {
    ctx.strokeStyle = 'black';
    ctx.lineWidth = width;
    ctx.setLineDash(dashPattern);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
