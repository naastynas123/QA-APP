/**
 * Marker Generator
 * Places chainaged markers at regular intervals along wall paths
 */
import { WallPath, Marker } from './types';
export interface MarkerConfig {
    spacingMetres: number;
    includeEndpoints: boolean;
}
export declare const DEFAULT_MARKER_CONFIG: MarkerConfig;
export declare class MarkerGenerator {
    private config;
    constructor(config?: Partial<MarkerConfig>);
    /**
     * Generate markers for a single wall path
     */
    generateMarkersForWall(wall: WallPath, metresPerUnit: number | null): Marker[];
    /**
     * Generate markers for all wall paths
     */
    generateMarkersForAllWalls(wallPaths: WallPath[], metresPerUnit: number | null): WallPath[];
    /**
     * Convert markers to canvas coordinates (if needed for rendering)
     */
    static markerToCanvasCoords(marker: Marker, pageScale?: number): {
        x: number;
        y: number;
    };
    /**
     * Generate a CSV representation of markers for export
     */
    static exportMarkersToCSV(wallPaths: WallPath[]): string;
}
//# sourceMappingURL=markerGenerator.d.ts.map