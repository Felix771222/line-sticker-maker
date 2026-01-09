import UPNG from 'upng-js';
import pako from 'pako';

/**
 * Remove background based on clicked color and tolerance
 * @param {ImageData} imageData 
 * @param {number} startX 
 * @param {number} startY 
 * @param {number} tolerance 
 */
export function removeBackground(imageData, startX, startY, tolerance) {
    const { width, height, data } = imageData;
    const targetIdx = (startY * width + startX) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];

    const visited = new Uint8Array(width * height);
    const queue = [[startX, startY]];

    while (queue.length > 0) {
        const [x, y] = queue.pop();
        const idx = (y * width + x) * 4;

        if (visited[y * width + x]) continue;
        visited[y * width + x] = 1;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const distance = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
        );

        if (distance <= tolerance) {
            data[idx + 3] = 0; // Set alpha to 0 (transparent)

            // Check neighbors
            if (x > 0) queue.push([x - 1, y]);
            if (x < width - 1) queue.push([x + 1, y]);
            if (y > 0) queue.push([x, y - 1]);
            if (y < height - 1) queue.push([x, y + 1]);
        }
    }

    return imageData;
}

/**
 * Simple color-range based background removal (non-flood fill, just global)
 */
export function removeColorGlobal(imageData, targetR, targetG, targetB, tolerance) {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
        );

        if (distance <= tolerance) {
            data[i + 3] = 0;
        }
    }
    return imageData;
}

/**
 * Encode multiple frames into APNG
 * @param {HTMLCanvasElement[]} frames 
 * @param {number} delay 
 * @returns {ArrayBuffer}
 */
export function encodeAPNG(canvases, delay = 100, loop = 0) {
    if (canvases.length === 0) return null;

    const width = canvases[0].width;
    const height = canvases[0].height;

    const bufs = canvases.map(canvas => {
        const ctx = canvas.getContext('2d');
        return ctx.getImageData(0, 0, width, height).data.buffer;
    });

    const delays = new Array(bufs.length).fill(delay);

    // UPNG encodes RGBA buffers
    // 0 = infinite loop
    const apng = UPNG.encode(bufs, width, height, loop, delays);
    return apng;
}

/**
 * Flood fill (Magic Wand) background removal
 */
export function floodFill(imageData, startX, startY, tolerance) {
    const { width, height, data } = imageData;
    const targetIdx = (startY * width + startX) * 4;
    const targetR = data[targetIdx];
    const targetG = data[targetIdx + 1];
    const targetB = data[targetIdx + 2];

    if (data[targetIdx + 3] === 0) return imageData; // Already transparent

    const visited = new Uint8Array(width * height);
    const stack = [[startX, startY]];

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        const idx = (y * width + x) * 4;

        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (visited[y * width + x]) continue;

        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        const distance = Math.sqrt(
            Math.pow(r - targetR, 2) +
            Math.pow(g - targetG, 2) +
            Math.pow(b - targetB, 2)
        );

        if (distance <= tolerance) {
            data[idx + 3] = 0;
            visited[y * width + x] = 1;

            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }
    }

    return imageData;
}

/**
 * Resize image to target dimensions, maintaining aspect ratio and centering it on a fixed-size canvas.
 */
export function resizeCanvas(canvas, targetW = 320, targetH = 270) {
    const w = canvas.width;
    const h = canvas.height;

    const widthRatio = targetW / w;
    const heightRatio = targetH / h;
    const ratio = Math.min(widthRatio, heightRatio);

    const newW = w * ratio;
    const newH = h * ratio;

    const resizedCanvas = document.createElement('canvas');
    resizedCanvas.width = targetW;
    resizedCanvas.height = targetH;
    const ctx = resizedCanvas.getContext('2d');

    // Center the image
    const dx = (targetW - newW) / 2;
    const dy = (targetH - newH) / 2;

    ctx.drawImage(canvas, 0, 0, w, h, dx, dy, newW, newH);
    return resizedCanvas;
}
