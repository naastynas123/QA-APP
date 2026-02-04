/**
 * Wall Builder
 * Constructs WallPath objects from filtered polylines with metadata
 */
import { Polyline, WallPath, Marker } from './types';
export declare class WallBuilder {
    /**
     * Build WallPath objects from filtered polylines
     */
    static buildWallPaths(polylines: Polyline[], metresPerUnit: number | null, markers?: Map<number, Marker[]>): WallPath[];
    /**
     * Connect fragmented wall segments that should logically form one wall
     */
    static mergeAdjacentWalls(wallPaths: WallPath[], proximityThreshold?: number, angleTolerance?: number): WallPath[];
    private static shouldMerge;
    private static mergeWallGroup;
    /**
     * Generate textual summary of a wall
     */
    static summarizeWall(wall: WallPath): string;
}
//# sourceMappingURL=wallBuilder.d.ts.map