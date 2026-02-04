/**
 * Wall Detector
 * Main orchestrator that coordinates all modules to perform complete wall detection
 */
import { DEFAULT_FILTER_CONFIG } from './wallFilter';
import { DEFAULT_MARKER_CONFIG } from './markerGenerator';
import { DEFAULT_SCORING_CONFIG } from './scoringEngine';
import { DetectionResult } from './types';
export interface DetectionConfig {
    filterConfig?: Partial<typeof DEFAULT_FILTER_CONFIG>;
    markerConfig?: Partial<typeof DEFAULT_MARKER_CONFIG>;
    scoringConfig?: Partial<typeof DEFAULT_SCORING_CONFIG>;
    mergeAdjacentWalls?: boolean;
    proximityThreshold?: number;
    angleTolerance?: number;
}
export declare class WallDetector {
    private debugLog;
    detectWallsFromPDF(pdfBuffer: Buffer, config?: DetectionConfig): Promise<DetectionResult>;
    private log;
    getDebugLog(): string[];
}
/**
 * Convenience function to detect walls and get results
 */
export declare function detectWallsInPDF(pdfBuffer: Buffer, config?: DetectionConfig): Promise<DetectionResult>;
//# sourceMappingURL=wallDetector.d.ts.map