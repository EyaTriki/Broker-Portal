/**
 * Rasterises the first page of a PDF so the business card scanner can read
 * letterheads and invoices. Like the OCR engine, pdf.js and its worker load on
 * demand and run entirely in the browser: the file never leaves the device.
 */

/** Matches the width the OCR preprocessor targets, so the page is rasterised once. */
const TARGET_WIDTH = 1600;
/** Guards against multi-hundred-megapixel canvases on large format pages. */
const MAX_SCALE = 3;

function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('The PDF page could not be converted to an image.')),
      'image/png',
    );
  });
}

export function isPdfFile(file: File) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export async function renderPdfFirstPage(file: File): Promise<Blob> {
  // The legacy build ships the polyfills the default build assumes: pdf.js 5 calls
  // `Map.prototype.getOrInsertComputed`, which no shipping browser has yet. It also
  // keeps the scanner working on the older mobile Safari versions brokers use.
  const [pdfjs, workerUrl] = await Promise.all([
    import('pdfjs-dist/legacy/build/pdf.mjs'),
    import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default;

  const pdf = await pdfjs.getDocument({
    data: await file.arrayBuffer(),
    // We only rasterise a page, so there is no need to accept the eval risk.
    isEvalSupported: false,
  }).promise;

  try {
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({ scale: 1 });
    const scale = Math.min(MAX_SCALE, Math.max(1, TARGET_WIDTH / unscaled.width));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    // pdf.js paints an opaque white background by default, which is what OCR needs:
    // an unpainted canvas is transparent and reads as black once flattened.
    await page.render({ canvas, viewport }).promise;

    return await canvasToPng(canvas);
  } finally {
    void pdf.destroy();
  }
}
