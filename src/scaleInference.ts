/**
 * Scale Inference Engine
 * Detects scale from dimension annotations or automatically infers from dimension lines
 */

import { Point, DimensionLine, ScaleInfo } from './types';

export class ScaleInference {
  private debugLog: string[] = [];

  /**
   * Infer scale using multiple strategies
   */
  inferScale(dimensionLines: DimensionLine[], pageText: string[]): ScaleInfo {
    // Strategy 1: Look for explicit scale annotation
    const annotationScale = this.detectScaleAnnotation(pageText);
    if (annotationScale) {
      this.debugLog.push(`Found scale annotation: ${annotationScale.sourceInfo}`);
      return annotationScale;
    }

    // Strategy 2: Use detected dimension lines
    const dimensionScale = this.inferFromDimensionLines(dimensionLines);
    if (dimensionScale) {
      this.debugLog.push(`Inferred scale from dimension line: ${dimensionScale.sourceInfo}`);
      return dimensionScale;
    }

    // Strategy 3: Fallback
    this.debugLog.push('No scale detected, returning null metresPerUnit');
    return {
      metresPerUnit: null,
      strategy: 'fallback',
      confidence: 'low',
      sourceInfo: 'No scale detected; user input required',
    };
  }

  /**
   * Strategy 1: Parse scale annotations like "SCALE 1:100" or "1:50"
   */
  private detectScaleAnnotation(pageText: string[]): ScaleInfo | null {
    const scalePattern = /(?:scale|scl)\s*[:\=]?\s*1\s*[:/]\s*(\d+(?:\.\d+)?)/i;

    for (const text of pageText) {
      const match = text.match(scalePattern);
      if (match) {
        const ratio = parseFloat(match[1]);
        // If ratio is 100, then 1 PDF unit = 100 user units (e.g., cm or mm)
        // Typically CAD scales assume mm on drawing = actual mm/ratio
        // For simplicity: assuming 1 PDF unit = ratio * 1 mm = ratio / 1000 metres
        const metresPerUnit = ratio / 1000;

        return {
          metresPerUnit,
          strategy: 'annotation',
          confidence: 'high',
          sourceInfo: `Found "SCALE 1:${ratio}" in document`,
        };
      }
    }

    return null;
  }

  /**
   * Strategy 2: Extract scale from dimension lines with labels
   * Assumes: if a line is labeled "10.0 m" and measures 100 PDF units,
   *          then 1 PDF unit = 10.0 / 100 = 0.1 metres
   */
  private inferFromDimensionLines(dimensionLines: DimensionLine[]): ScaleInfo | null {
    if (dimensionLines.length === 0) {
      return null;
    }

    let bestInference: ScaleInfo | null = null;
    let highestConfidence = -1;

    for (const dimLine of dimensionLines) {
      const extracted = this.extractMetresFromLabel(dimLine.labelText);
      if (extracted === null) continue;

      const metresPerUnit = extracted / dimLine.lengthInPDFUnits;
      const confidence = this.assessDimensionLineConfidence(dimLine);
      const confidenceLevel = confidence > 0.8 ? 'high' : confidence > 0.5 ? 'medium' : 'low';

      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        bestInference = {
          metresPerUnit,
          strategy: 'dimension-line',
          confidence: confidenceLevel,
          sourceInfo: `Dimension line "${dimLine.labelText}" → ${metresPerUnit.toFixed(6)} m/unit`,
        };
      }
    }

    return bestInference;
  }

  private extractMetresFromLabel(label: string): number | null {
    // Match patterns like "10.0 m", "5.0", "10.000 m", etc.
    const patterns = [
      /(\d+\.?\d*)\s*(?:m|meter|metre|meters|metres)/i, // with unit
      /(\d+\.\d+)/, // decimal number
    ];

    for (const pattern of patterns) {
      const match = label.match(pattern);
      if (match) {
        return parseFloat(match[1]);
      }
    }

    return null;
  }

  private assessDimensionLineConfidence(dimLine: DimensionLine): number {
    let confidence = 0.5;

    // Boost confidence if label explicitly includes metric unit
    if (/\s*m(?:eter|tre|eters|tres)?$/i.test(dimLine.labelText)) {
      confidence += 0.3;
    }

    // Boost confidence if dimension is in a "reasonable" range
    // (e.g., not 0.0001 or 99999)
    const metres = this.extractMetresFromLabel(dimLine.labelText) || 0;
    if (metres > 0.1 && metres < 1000) {
      confidence += 0.1;
    }

    // Boost confidence if PDF measurement is in reasonable range
    if (dimLine.lengthInPDFUnits > 10 && dimLine.lengthInPDFUnits < 5000) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Allow manual scale setting
   */
  static createManualScale(metresPerUnit: number): ScaleInfo {
    return {
      metresPerUnit,
      strategy: 'annotation',
      confidence: 'high',
      sourceInfo: `Manual scale entry: ${metresPerUnit} m/unit`,
    };
  }

  getDebugLog(): string[] {
    return this.debugLog;
  }
}
