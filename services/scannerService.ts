declare global {
  interface Window {
    cv: any;
  }
}

interface Point {
  x: number;
  y: number;
}

export const processDocumentScan = async (
  canvas: HTMLCanvasElement
): Promise<string | null> => {
  if (!window.cv || typeof window.cv.Mat === 'undefined') {
    console.warn("OpenCV not loaded yet");
    return null;
  }
  
  const cv = window.cv;

  try {
    const src = cv.imread(canvas);
    const dst = new cv.Mat();
    const smallSrc = new cv.Mat();
    
    // Optimization: Downscale for faster detection if image is large
    // We process on a smaller image but apply crops to the full resolution image
    const maxDim = 800;
    const scale = Math.min(maxDim / src.rows, maxDim / src.cols, 1);
    
    if (scale < 1) {
        const dsize = new cv.Size(src.cols * scale, src.rows * scale);
        cv.resize(src, smallSrc, dsize, 0, 0, cv.INTER_AREA);
    } else {
        src.copyTo(smallSrc);
    }

    // Pre-processing
    const gray = new cv.Mat();
    const blurred = new cv.Mat();
    const edges = new cv.Mat();

    cv.cvtColor(smallSrc, gray, cv.COLOR_RGBA2GRAY, 0);
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
    cv.Canny(blurred, edges, 75, 200);

    // Find Contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

    // Find largest quadrilateral
    let maxArea = 0;
    let maxContourData: Point[] | null = null;

    for (let i = 0; i < contours.size(); ++i) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);
      
      // Minimum area filter (relative to smallSrc size)
      if (area < 5000) continue;

      const peri = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, 0.02 * peri, true);

      // Check if it's a convex quadrilateral
      if (approx.rows === 4 && cv.isContourConvex(approx)) {
        if (area > maxArea) {
          maxArea = area;
          // Extract points from the Mat
          maxContourData = [];
          for(let j=0; j<4; j++) {
              maxContourData.push({
                  x: approx.data32S[j*2],
                  y: approx.data32S[j*2+1]
              });
          }
        }
      }
      approx.delete();
    }

    if (maxContourData) {
      // We found a document. 
      // 1. Scale points back up to original resolution
      const points = maxContourData.map(p => ({
          x: p.x / scale,
          y: p.y / scale
      }));

      // 2. Order points: TL, TR, BR, BL
      const [tl, tr, br, bl] = orderPoints(points);

      // 3. Determine width and height of output (Max of widths/heights)
      const widthA = Math.hypot(br.x - bl.x, br.y - bl.y);
      const widthB = Math.hypot(tr.x - tl.x, tr.y - tl.y);
      const maxWidth = Math.max(widthA, widthB);

      const heightA = Math.hypot(tr.x - br.x, tr.y - br.y);
      const heightB = Math.hypot(tl.x - bl.x, tl.y - bl.y);
      const maxHeight = Math.max(heightA, heightB);

      // 4. Create Source and Destination Mats for Warp
      const srcTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        tl.x, tl.y,
        tr.x, tr.y,
        br.x, br.y,
        bl.x, bl.y
      ]);

      const dstTri = cv.matFromArray(4, 1, cv.CV_32FC2, [
        0, 0,
        maxWidth, 0,
        maxWidth, maxHeight,
        0, maxHeight
      ]);

      // 5. Warp Perspective (Crop and Flatten)
      const M = cv.getPerspectiveTransform(srcTri, dstTri);
      cv.warpPerspective(src, dst, M, new cv.Size(maxWidth, maxHeight), cv.INTER_LINEAR, cv.BORDER_CONSTANT, new cv.Scalar());

      // Update the canvas to show the cropped result
      // This resizing of the canvas is handled by cv.imshow automatically
      cv.imshow(canvas, dst);

      // Cleanup transform mats
      srcTri.delete(); dstTri.delete(); M.delete();
    } else {
      // No document found: Return original image
      // We ensure the canvas has the original image data
      cv.imshow(canvas, src);
    }

    // Cleanup common mats
    src.delete(); dst.delete(); smallSrc.delete();
    gray.delete(); blurred.delete(); edges.delete();
    contours.delete(); hierarchy.delete();
    
    return canvas.toDataURL('image/jpeg', 0.9);

  } catch (e) {
    console.error("OpenCV processing failed", e);
    return null;
  }
};

// Helper to order points as: Top-Left, Top-Right, Bottom-Right, Bottom-Left
const orderPoints = (points: Point[]): Point[] => {
  // Sort by sum of coordinates (x+y). 
  // TL usually has smallest sum, BR has largest sum.
  const sortedBySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y));
  
  const tl = sortedBySum[0];
  const br = sortedBySum[3];
  
  // The remaining two are TR and BL.
  // TR usually has smallest difference (y-x) (x is large, y is small)
  // BL usually has largest difference (y-x) (x is small, y is large)
  const remaining = [sortedBySum[1], sortedBySum[2]];
  const sortedByDiff = [...remaining].sort((a, b) => (a.y - a.x) - (b.y - b.x));
  
  const tr = sortedByDiff[0];
  const bl = sortedByDiff[1];

  return [tl, tr, br, bl];
};