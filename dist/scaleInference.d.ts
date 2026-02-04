/**
 * Scale Inference Engine
 * Detects scale from dimension annotations or automatically infers from dimension lines
 */
import { DimensionLine, ScaleInfo } from './types';
export declare class ScaleInference {
    private debugLog;
    /**
     * Infer scale using multiple strategies
     */
    inferScale(dimensionLines: DimensionLine[], pageText: string[]): ScaleInfo;
    /**
     * Strategy 1: Parse scale annotations like "SCALE 1:100" or "1:50"
     */
    private detectScaleAnnotation;
    /**
     * Strategy 2: Extract scale from dimension lines with labels
     * Assumes: if a line is labeled "10.0 m" and measures 100 PDF units,
     *          then 1 PDF unit = 10.0 / 100 = 0.1 metres
     */
    private inferFromDimensionLines;
    private extractMetresFromLabel;
    private assessDimensionLineConfidence;
    /**
     * Allow manual scale setting
     */
    static createManualScale(metresPerUnit: number): ScaleInfo;
    getDebugLog(): string[];
}
//# sourceMappingURL=scaleInference.d.ts.map