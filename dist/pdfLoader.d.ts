/**
 * PDF Loader and Geometry Extractor
 * Extracts vector paths, stroke properties, and dimension lines from PDFs
 */
import { PDFGeometry } from './types';
export declare class PDFLoader {
    private debugLog;
    loadPDF(pdfBuffer: Buffer): Promise<PDFGeometry[]>;
    private extractPageGeometry;
    private extractDimensionLines;
    private findNearbyLabel;
    private isNumeric;
    private colorFromArgs;
    private approximateArcCenter;
    getDebugLog(): string[];
}
//# sourceMappingURL=pdfLoader.d.ts.map