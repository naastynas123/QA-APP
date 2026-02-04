/**
 * Example usage of the wall detection system
 * Shows how to integrate with your QA app
 */

import { detectWallsInPDF, DetectionConfig } from './wallDetector';
import fs from 'fs';

/**
 * Example 1: Basic detection
 */
async function exampleBasicDetection() {
  console.log('=== Example 1: Basic Detection ===\n');

  const pdfBuffer = fs.readFileSync('./sample-floorplan.pdf');

  const result = await detectWallsInPDF(pdfBuffer);

  console.log(`Detected ${result.wallPaths.length} walls`);
  console.log(`Scale: ${result.scaleInfo.metresPerUnit} metres/unit (${result.scaleInfo.strategy})`);

  for (const wall of result.wallPaths) {
    console.log(`\nWall ${wall.id.substring(0, 8)}:`);
    console.log(`  Length: ${wall.lengthMetres.toFixed(2)} m`);
    console.log(`  Confidence: ${wall.confidenceScore.toFixed(3)}`);
    console.log(`  Segments: ${wall.polyline.segments.length}`);
    console.log(`  Markers: ${wall.markers.length}`);

    if (wall.markers.length > 0) {
      console.log('  Chainage (first 5):');
      for (let i = 0; i < Math.min(5, wall.markers.length); i++) {
        console.log(`    ${wall.markers[i].chainageMetres.toFixed(2)} m at (${wall.markers[i].position.x.toFixed(1)}, ${wall.markers[i].position.y.toFixed(1)})`);
      }
    }
  }
}

/**
 * Example 2: Custom configuration
 */
async function exampleWithCustomConfig() {
  console.log('\n=== Example 2: Custom Configuration ===\n');

  const pdfBuffer = fs.readFileSync('./sample-floorplan.pdf');

  const config: DetectionConfig = {
    filterConfig: {
      minStrokeWidth: 0.3,
      minSegmentLength: 5, // More permissive
    },
    markerConfig: {
      spacingMetres: 2.5, // Markers every 2.5m instead of 5m
      includeEndpoints: true,
    },
    scoringConfig: {
      minLengthMetres: 0.1, // Accept shorter walls
    },
  };

  const result = await detectWallsInPDF(pdfBuffer, config);

  console.log(`Detected ${result.wallPaths.length} walls with custom config`);
  console.log(`Debug log entries: ${result.debugLog.length}`);
}

/**
 * Example 3: Fallback with manual scale
 */
async function exampleManualScale() {
  console.log('\n=== Example 3: Manual Scale Override ===\n');

  const pdfBuffer = fs.readFileSync('./sample-floorplan.pdf');

  let result = await detectWallsInPDF(pdfBuffer);

  if (!result.scaleInfo.metresPerUnit) {
    console.log('Automatic scale detection failed, applying manual scale...');

    // Suppose the user measures 100 PDF units = 10 metres
    const manualMetresPerUnit = 10 / 100; // 0.1

    // Would typically update through API endpoint /api/set-scale
    const updatedWalls = result.wallPaths.map(wall => ({
      ...wall,
      lengthMetres: wall.polyline.totalLength * manualMetresPerUnit,
    }));

    console.log(`Applied manual scale: ${manualMetresPerUnit} m/unit`);
    console.log(`Updated ${updatedWalls.length} walls with new lengths`);

    for (const wall of updatedWalls.slice(0, 3)) {
      console.log(`  Wall ${wall.id.substring(0, 8)}: ${wall.lengthMetres.toFixed(2)} m`);
    }
  }
}

/**
 * Example 4: Processing multi-page PDFs
 */
async function exampleMultiPage() {
  console.log('\n=== Example 4: Multi-Page Handling ===\n');

  const pdfBuffer = fs.readFileSync('./multi-page-floorplan.pdf');

  const result = await detectWallsInPDF(pdfBuffer);

  console.log(`Processed PDF with page: ${result.pageWidth}x${result.pageHeight} units`);
  console.log(`Found ${result.totalDimensionLinesFound} dimension annotations`);
  console.log(`Detected ${result.wallPaths.length} walls total`);

  // Group walls by confidence level
  const highConfidence = result.wallPaths.filter(w => w.confidenceScore > 0.8);
  const mediumConfidence = result.wallPaths.filter(w => w.confidenceScore >= 0.5 && w.confidenceScore <= 0.8);
  const lowConfidence = result.wallPaths.filter(w => w.confidenceScore < 0.5);

  console.log(`\nConfidence breakdown:`);
  console.log(`  High (>0.8): ${highConfidence.length}`);
  console.log(`  Medium (0.5-0.8): ${mediumConfidence.length}`);
  console.log(`  Low (<0.5): ${lowConfidence.length}`);
}

/**
 * Example 5: Export markers for measurement
 */
async function exampleExportMarkers() {
  console.log('\n=== Example 5: Export Markers ===\n');

  const pdfBuffer = fs.readFileSync('./sample-floorplan.pdf');

  const result = await detectWallsInPDF(pdfBuffer);

  // Export to CSV
  const csvContent = require('./markerGenerator').MarkerGenerator.exportMarkersToCSV(result.wallPaths);
  fs.writeFileSync('markers.csv', csvContent);

  console.log('Exported markers to markers.csv:');
  console.log(csvContent.split('\n').slice(0, 5).join('\n'));
  console.log('...');
}

// Run examples (comment out as needed)
if (require.main === module) {
  (async () => {
    try {
      // await exampleBasicDetection();
      // await exampleWithCustomConfig();
      // await exampleManualScale();
      // await exampleMultiPage();
      // await exampleExportMarkers();
      console.log('Examples defined. Uncomment in examples.ts to run.');
    } catch (error) {
      console.error('Error:', error);
    }
  })();
}

export {
  exampleBasicDetection,
  exampleWithCustomConfig,
  exampleManualScale,
  exampleMultiPage,
  exampleExportMarkers,
};
