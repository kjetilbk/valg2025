/**
 * Watermark module for adding GitHub repository attribution to generated images
 */

/**
 * Draw watermark in bottom right corner of canvas
 */
export function drawWatermark(
    // biome-ignore lint/suspicious/noExplicitAny: Canvas context from @napi-rs/canvas has different type than browser CanvasRenderingContext2D
    ctx: any,
    canvasWidth: number,
    canvasHeight: number,
    customY?: number
): void {
    const watermarkText = 'github.com/kjetilbk/valg2025';
    const padding = 10;

    // Set watermark style
    ctx.save();
    ctx.fillStyle = '#666666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    // Use default textBaseline to match the label text positioning

    // Position in bottom right corner or at custom Y position
    const x = canvasWidth - padding;
    const y = customY !== undefined ? customY : canvasHeight - padding;

    // Draw watermark text
    ctx.fillText(watermarkText, x, y);
    ctx.restore();
}
