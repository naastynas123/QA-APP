/**
 * PDF Loader and Geometry Extractor
 * Extracts vector paths, stroke properties, and dimension lines from PDFs
 */

import * as pdfjsLib from 'pdfjs-dist';
import { PDFGeometry, Segment, ArcSegment, DimensionLine, Point } from './types';

// Set worker for PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface PathCommand {
  type: string;
  args: number[];
}

export class PDFLoader {
  private debugLog: string[] = [];

  async loadPDF(pdfBuffer: Buffer): Promise<PDFGeometry[]> {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      this.debugLog.push(`Loaded PDF with ${pdf.numPages} pages`);

      const allPageGeometries: PDFGeometry[] = [];

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.0 });
        const geometry = await this.extractPageGeometry(page, viewport, pageNum);
        allPageGeometries.push(geometry);
        this.debugLog.push(`Page ${pageNum}: extracted ${geometry.segments.length} segments`);
      }

      return allPageGeometries;
    } catch (error) {
      throw new Error(`Failed to load PDF: ${error}`);
    }
  }

  private async extractPageGeometry(
    page: pdfjsLib.PDFPageProxy,
    viewport: pdfjsLib.PageViewport,
    pageNumber: number
  ): Promise<PDFGeometry> {
    const operatorList = await page.getOperatorList();
    const segments: Segment[] = [];
    const arcSegments: ArcSegment[] = [];
    const dimensionLines: DimensionLine[] = [];
    const textElements: { text: string; position: Point; size: number }[] = [];

    let currentStrokeWidth = 1;
    let currentColor = '#000000';
    let currentLayer = 'default';
    let pathCommands: PathCommand[] = [];
    let currentPoint: Point = { x: 0, y: 0 };

    const fnArray = operatorList.fnArray;
    const argsArray = operatorList.argsArray;

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i] || [];

      // Graphics state operators
      if (fn === pdfjsLib.OPS.setLineWidth) {
        currentStrokeWidth = args[0] as number;
      }

      if (fn === pdfjsLib.OPS.setStrokeColorSpace || fn === pdfjsLib.OPS.setFillColorSpace) {
        currentColor = this.colorFromArgs(args);
      }

      // Path construction operators
      if (fn === pdfjsLib.OPS.moveTo) {
        currentPoint = { x: args[0] as number, y: args[1] as number };
        pathCommands = [{ type: 'moveTo', args: [args[0] as number, args[1] as number] }];
      }

      if (fn === pdfjsLib.OPS.lineTo) {
        const endPoint = { x: args[0] as number, y: args[1] as number };
        segments.push({
          start: currentPoint,
          end: endPoint,
          strokeWidth: currentStrokeWidth,
          color: currentColor,
          layer: currentLayer,
        });
        pathCommands.push({ type: 'lineTo', args: [args[0] as number, args[1] as number] });
        currentPoint = endPoint;
      }

      // Bezier curves (approximate as arc segments)
      if (fn === pdfjsLib.OPS.bezierCurveTo) {
        const cp1 = { x: args[0] as number, y: args[1] as number };
        const cp2 = { x: args[2] as number, y: args[3] as number };
        const end = { x: args[4] as number, y: args[5] as number };

        arcSegments.push({
          type: 'arc',
          start: currentPoint,
          end: end,
          strokeWidth: currentStrokeWidth,
          color: currentColor,
          layer: currentLayer,
          center: this.approximateArcCenter(currentPoint, cp1, cp2, end),
        });
        currentPoint = end;
      }

      // Quadratic Bezier (curveTo)
      if (fn === pdfjsLib.OPS.curveTo) {
        const cp = { x: args[0] as number, y: args[1] as number };
        const end = { x: args[2] as number, y: args[3] as number };

        arcSegments.push({
          type: 'arc',
          start: currentPoint,
          end: end,
          strokeWidth: currentStrokeWidth,
          color: currentColor,
          layer: currentLayer,
        });
        currentPoint = end;
      }

      // Text extraction for dimension parsing
      if (fn === pdfjsLib.OPS.showText || fn === pdfjsLib.OPS.showSpacedText) {
        const textContent = await page.getTextContent();
        for (const item of textContent.items) {
          if ('str' in item) {
            textElements.push({
              text: item.str,
              position: { x: item.transform[4], y: item.transform[5] },
              size: item.height,
            });
          }
        }
      }

      // Stroke operator (draws the path)
      if (fn === pdfjsLib.OPS.stroke || fn === pdfjsLib.OPS.fillStroke) {
        pathCommands = [];
      }
    }

    // Extract potential dimension lines from geometry
    const extractedDimensionLines = this.extractDimensionLines(segments, textElements);
    dimensionLines.push(...extractedDimensionLines);

    return {
      segments,
      arcSegments,
      dimensionLines,
      textElements,
      page: {
        width: viewport.width,
        height: viewport.height,
        pageNumber,
      },
    };
  }

  private extractDimensionLines(segments: Segment[], textElements: any[]): DimensionLine[] {
    const dimensionLines: DimensionLine[] = [];

    // Heuristic: dimension lines are typically thin horizontal/vertical lines
    // with numeric text labels nearby
    for (const seg of segments) {
      if (seg.strokeWidth < 0.5) continue; // Too thin to be a dimension line

      const distance = Math.sqrt(
        Math.pow(seg.end.x - seg.start.x, 2) + Math.pow(seg.end.y - seg.start.y, 2)
      );

      // Look for numeric labels near this segment
      const labelText = this.findNearbyLabel(seg, textElements);
      if (labelText && this.isNumeric(labelText)) {
        const midpoint = {
          x: (seg.start.x + seg.end.x) / 2,
          y: (seg.start.y + seg.end.y) / 2,
        };

        dimensionLines.push({
          startPoint: seg.start,
          endPoint: seg.end,
          labelText,
          labelPosition: midpoint,
          lengthInPDFUnits: distance,
        });
      }
    }

    return dimensionLines;
  }

  private findNearbyLabel(segment: Segment, textElements: any[]): string | null {
    const midpoint = {
      x: (segment.start.x + segment.end.x) / 2,
      y: (segment.start.y + segment.end.y) / 2,
    };

    const threshold = 50; // proximity threshold in PDF units

    for (const text of textElements) {
      const dist = Math.sqrt(
        Math.pow(text.position.x - midpoint.x, 2) + Math.pow(text.position.y - midpoint.y, 2)
      );
      if (dist < threshold) {
        return text.text;
      }
    }

    return null;
  }

  private isNumeric(text: string): boolean {
    const numericPattern = /^\d+\.?\d*\s*(m|mm|meters?|metres?)?$/i;
    return numericPattern.test(text.trim());
  }

  private colorFromArgs(args: any[]): string {
    if (args.length === 0) return '#000000';

    if (args.length === 1) {
      // Grayscale
      const gray = Math.round((args[0] as number) * 255);
      return `#${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}${gray.toString(16).padStart(2, '0')}`;
    }

    if (args.length >= 3) {
      // RGB or CMYK (treating first 3 as RGB)
      const r = Math.round((args[0] as number) * 255);
      const g = Math.round((args[1] as number) * 255);
      const b = Math.round((args[2] as number) * 255);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    return '#000000';
  }

  private approximateArcCenter(p1: Point, cp1: Point, cp2: Point, p2: Point): Point {
    // Simple midpoint approximation for arc center
    return {
      x: (p1.x + cp1.x + cp2.x + p2.x) / 4,
      y: (p1.y + cp1.y + cp2.y + p2.y) / 4,
    };
  }

  getDebugLog(): string[] {
    return this.debugLog;
  }
}
