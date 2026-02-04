/**
 * Scale Calibration System
 * Handles scale detection from PDF metadata and user calibration
 */

import { Point } from './types';

export interface ScaleCalibrationPoint {
  pixelCoord: Point;
  metresValue: number;
  label: string;
}

export interface CalibrationResult {
  metresPerPixel: number;
  confidence: 'high' | 'medium' | 'low';
  strategy: 'metadata' | 'user-click' | 'fallback';
  sourceInfo: string;
}

export class ScaleCalibrator {
  private calibrationPoints: ScaleCalibrationPoint[] = [];
  private metresPerPixel: number | null = null;
  private confidence: 'high' | 'medium' | 'low' = 'low';
  private strategy: 'metadata' | 'user-click' | 'fallback' = 'fallback';
  private sourceInfo: string = '';

  /**
   * Try to calibrate from PDF metadata (DPI, scale annotations, dimension lines)
   */
  calibrateFromMetadata(pdfDpi: number, pdfScaleRatio?: number): CalibrationResult {
    // Standard PDF DPI is 72
    // If we know the physical scale ratio from PDF metadata:
    if (pdfScaleRatio) {
      // pdfScaleRatio = inches per logical unit
      // 1 inch = 2.54 cm = 0.0254 m
      const metresPerLogicalUnit = pdfScaleRatio * 0.0254;
      const pointsPerInch = 72; // PDF points
      const pointsPerMetre = pointsPerInch / metresPerLogicalUnit;
      this.metresPerPixel = 1 / pointsPerMetre; // Assuming 1 pixel ≈ 1 point

      this.strategy = 'metadata';
      this.confidence = 'high';
      this.sourceInfo = `PDF metadata: ${pdfDpi} DPI, scale ratio ${pdfScaleRatio}`;

      return this.getResult();
    }

    // Fallback: assume standard DPI
    const pointsPerMetre = (pdfDpi / 0.0254) * 1; // rough estimate
    this.metresPerPixel = 1 / pointsPerMetre;

    this.strategy = 'metadata';
    this.confidence = 'low';
    this.sourceInfo = `PDF DPI: ${pdfDpi}`;

    return this.getResult();
  }

  /**
   * User clicks two points on canvas with known real-world distance
   * @param point1 First pixel coordinate
   * @param point2 Second pixel coordinate
   * @param knownDistanceMetres Real-world distance between points
   */
  calibrateFromUserClicks(
    point1: Point,
    point2: Point,
    knownDistanceMetres: number
  ): CalibrationResult {
    const pixelDistance = this.distancePointToPoint(point1, point2);

    if (pixelDistance === 0) {
      this.confidence = 'low';
      this.sourceInfo = 'Invalid: points are the same';
      return this.getResult();
    }

    this.metresPerPixel = knownDistanceMetres / pixelDistance;

    this.calibrationPoints.push(
      {
        pixelCoord: point1,
        metresValue: 0,
        label: 'Point 1',
      },
      {
        pixelCoord: point2,
        metresValue: knownDistanceMetres,
        label: 'Point 2',
      }
    );

    this.strategy = 'user-click';
    this.confidence = 'high';
    this.sourceInfo = `User calibration: ${knownDistanceMetres}m = ${pixelDistance.toFixed(0)} pixels`;

    return this.getResult();
  }

  /**
   * Add a multi-point calibration (e.g., click along a grid)
   * Compute least-squares fit
   */
  addCalibrationPoint(pixelCoord: Point, knownDistanceMetres: number, label: string): void {
    this.calibrationPoints.push({
      pixelCoord,
      metresValue: knownDistanceMetres,
      label,
    });

    if (this.calibrationPoints.length >= 2) {
      // Compute linear fit: metres = a * pixelDistance + b
      // Simplest case: assume all measurements are distances from origin
      const scale = this.leastSquaresFit(this.calibrationPoints);
      this.metresPerPixel = scale;
      this.confidence = 'high';
      this.strategy = 'user-click';
      this.sourceInfo = `Multi-point calibration: ${this.calibrationPoints.length} points`;
    }
  }

  /**
   * Get current calibration result
   */
  getResult(): CalibrationResult {
    return {
      metresPerPixel: this.metresPerPixel || 0.05, // fallback: 1 pixel = 5cm
      confidence: this.confidence,
      strategy: this.strategy,
      sourceInfo: this.sourceInfo || 'No calibration performed',
    };
  }

  /**
   * Convert pixel distance to metres using calibration
   */
  pixelsToMetres(pixelDistance: number): number {
    return pixelDistance * (this.metresPerPixel || 0.05);
  }

  /**
   * Convert metres to pixels
   */
  metresToPixels(metres: number): number {
    if (!this.metresPerPixel) return metres / 0.05;
    return metres / this.metresPerPixel;
  }

  /**
   * Least squares fit for calibration points
   * Assumes points are ordered and measures distance along a line
   */
  private leastSquaresFit(points: ScaleCalibrationPoint[]): number {
    // Compute distances between consecutive calibration points
    const distances: Array<{ pixel: number; metre: number }> = [];

    for (let i = 0; i < points.length - 1; i++) {
      const pixelDist = this.distancePointToPoint(points[i].pixelCoord, points[i + 1].pixelCoord);
      const metreDist = Math.abs(points[i + 1].metresValue - points[i].metresValue);

      if (pixelDist > 0) {
        distances.push({ pixel: pixelDist, metre: metreDist });
      }
    }

    if (distances.length === 0) return 0.05;

    // Average scale
    const scales = distances.map(d => d.metre / d.pixel);
    const avgScale = scales.reduce((a, b) => a + b, 0) / scales.length;

    return avgScale;
  }

  private distancePointToPoint(p1: Point, p2: Point): number {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * UI Helper: interactive scale calibration panel
 */
export class ScaleCalibrationUI {
  private canvas: HTMLCanvasElement;
  private calibrator: ScaleCalibrator;
  private clickPoints: Point[] = [];
  private uiEnabled = false;

  constructor(canvas: HTMLCanvasElement, calibrator: ScaleCalibrator) {
    this.canvas = canvas;
    this.calibrator = calibrator;
  }

  /**
   * Enable click-to-calibrate mode
   */
  enableCalibrationMode(): void {
    this.uiEnabled = true;
    this.clickPoints = [];

    this.canvas.style.cursor = 'crosshair';
    this.canvas.addEventListener('click', this.handleCanvasClick.bind(this));

    // Display instruction
    console.log('[ScaleCalibration] Click two points with known distance apart');
  }

  /**
   * Disable calibration mode
   */
  disableCalibrationMode(): void {
    this.uiEnabled = false;
    this.canvas.style.cursor = 'default';
    this.canvas.removeEventListener('click', this.handleCanvasClick.bind(this));
  }

  private handleCanvasClick(event: MouseEvent): void {
    if (!this.uiEnabled) return;

    const rect = this.canvas.getBoundingClientRect();
    const pixelCoord = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };

    this.clickPoints.push(pixelCoord);

    if (this.clickPoints.length === 1) {
      console.log(`[ScaleCalibration] Point 1 recorded at ${pixelCoord.x}, ${pixelCoord.y}`);
      console.log('[ScaleCalibration] Click a second point, then enter distance in metres');
    } else if (this.clickPoints.length === 2) {
      const distance = prompt('Enter distance between points (metres):');
      if (distance) {
        const metres = parseFloat(distance);
        this.calibrator.calibrateFromUserClicks(this.clickPoints[0], this.clickPoints[1], metres);
        console.log(
          `[ScaleCalibration] Calibration complete: ${metres}m = ${this.clickPoints[0].x}-${this.clickPoints[1].x} px`
        );
        this.disableCalibrationMode();
      }
    }
  }
}
