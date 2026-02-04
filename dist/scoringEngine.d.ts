/**
 * Scoring Engine
 * Computes confidence scores for wall paths and generates debug reports
 */
import { WallPath, DebugInfo } from './types';
export interface ScoringConfig {
    minLengthMetres: number;
    maxLengthMetres: number;
    idealStrokeWidth: number;
    minSegmentsForGoodScore: number;
}
export declare const DEFAULT_SCORING_CONFIG: ScoringConfig;
export declare class ScoringEngine {
    private config;
    constructor(config?: Partial<ScoringConfig>);
    /**
     * Compute confidence score for a wall path
     * Returns a value between 0 and 1
     */
    computeConfidenceScore(wall: WallPath): number;
    /**
     * Assess whether segments form a continuous path
     */
    private assessContinuity;
    /**
     * Assess similarity to typical wall characteristics
     */
    assessWallCharacteristics(wall: WallPath): {
        lengthScore: number;
        strokeScore: number;
        connectivityScore: number;
        overall: number;
    };
    private scoreLengthCharacteristic;
    private scoreStrokeCharacteristic;
    private scoreConnectivity;
    /**
     * Generate detailed debug information
     */
    generateDebugInfo(wall: WallPath, totalSegmentsAnalyzed: number, discardedStats: {
        tooThin: number;
        tooShort: number;
        other: number;
    }): DebugInfo;
    private identifyConnectionIssues;
    /**
     * Generate a detailed report for all walls
     */
    generateReport(wallPaths: WallPath[]): string;
}
//# sourceMappingURL=scoringEngine.d.ts.map