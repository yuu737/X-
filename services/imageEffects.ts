export interface GengaConfig {
    outline: string;
    shadow: string;
    highlight: string;
}

// Applies a Gaussian blur to a grayscale image data array to reduce noise.
export const applyGaussianBlur = (grayValues: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray => {
    const output = new Uint8ClampedArray(grayValues.length);
    // A simple 3x3 kernel
    const kernel = [
        [1, 2, 1],
        [2, 4, 2],
        [1, 2, 1]
    ];
    const kernelWeight = 16;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let sum = 0;
            for (let j = -1; j <= 1; j++) {
                for (let i = -1; i <= 1; i++) {
                    const gray = grayValues[(y + j) * width + (x + i)];
                    sum += gray * kernel[j + 1][i + 1];
                }
            }
            output[y * width + x] = sum / kernelWeight;
        }
    }
    // A simple way to handle edges is to copy them, to avoid black borders
    for (let y = 0; y < height; y++) {
        output[y * width] = grayValues[y * width];
        output[y * width + width - 1] = grayValues[y * width + width - 1];
    }
     for (let x = 0; x < width; x++) {
        output[x] = grayValues[x];
        output[(height-1) * width + x] = grayValues[(height-1) * width + x];
    }
    return output;
};


// This function processes the canvas data to create a pencil sketch effect.
export const applyPencilSketchEffect = (ctx: any, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const sketchData = ctx.createImageData(width, height);
    const sketch = sketchData.data;

    const grayValues = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        grayValues[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    
    const threshold = 15;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = y * width + x;
            const pixelIndex = i * 4;
            let finalColor = 255;
            
            // Check against pixel below for a simple vertical edge detection
            if (y < height - 1) { 
                const neighborIndex = i + width;
                const currentGray = grayValues[i];
                const neighborGray = grayValues[neighborIndex];
                const diff = Math.abs(currentGray - neighborGray);
                
                if (diff > threshold) {
                    finalColor = 20;
                }
            }

            sketch[pixelIndex] = finalColor;
            sketch[pixelIndex + 1] = finalColor;
            sketch[pixelIndex + 2] = finalColor;
            sketch[pixelIndex + 3] = 255;
        }
    }

    ctx.putImageData(sketchData, 0, 0);
};

// This function creates a cel-shading (anime keyframe) effect.
export const applyCelShadingEffect = (ctx: any, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;

    const levels = 4; // Posterization levels
    const step = 255 / (levels - 1);
    const edgeThreshold = 30;

    const grayValues = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        grayValues[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x);
            const pixelIndex = i * 4;
            
            // Edge detection using gradient
            const currentGray = grayValues[i];
            const rightGray = (x < width - 1) ? grayValues[i + 1] : currentGray;
            const downGray = (y < height - 1) ? grayValues[i + width] : currentGray;
            const gradX = Math.abs(currentGray - rightGray);
            const gradY = Math.abs(currentGray - downGray);
            const isEdge = (gradX + gradY) > edgeThreshold;

            if (isEdge) {
                output[pixelIndex] = 0; // Black outline
                output[pixelIndex + 1] = 0;
                output[pixelIndex + 2] = 0;
            } else {
                // Posterization for cel shading effect
                output[pixelIndex] = Math.round(data[pixelIndex] / step) * step;
                output[pixelIndex + 1] = Math.round(data[pixelIndex + 1] / step) * step;
                output[pixelIndex + 2] = Math.round(data[pixelIndex + 2] / step) * step;
            }
            output[pixelIndex + 3] = 255; // Full alpha
        }
    }

    ctx.putImageData(outputData, 0, 0);
};

// This function creates a pop art effect.
export const applyPopArtEffect = (ctx: any, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;
    
    const popArtPalette = [
        [255, 237, 0], // Yellow
        [255, 0, 140], // Magenta
        [0, 237, 255], // Cyan
    ];
    const edgeThreshold = 35;

    const grayValues = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        grayValues[i/4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x);
            const pixelIndex = i * 4;
            
            const currentGray = grayValues[i];
            const rightGray = (x < width - 1) ? grayValues[i + 1] : currentGray;
            const downGray = (y < height - 1) ? grayValues[i + width] : currentGray;
            const gradX = Math.abs(currentGray - rightGray);
            const gradY = Math.abs(currentGray - downGray);
            const isEdge = (gradX + gradY) > edgeThreshold;

            if (isEdge) {
                output[pixelIndex] = 0;
                output[pixelIndex + 1] = 0;
                output[pixelIndex + 2] = 0;
            } else {
                const intensity = grayValues[i];
                let color;
                if (intensity > 210) {
                    color = [255, 255, 255]; // White
                } else if (intensity > 150) {
                    color = popArtPalette[0]; // Yellow
                } else if (intensity > 80) {
                    color = popArtPalette[1]; // Magenta
                } else {
                    color = popArtPalette[2]; // Cyan
                }
                output[pixelIndex] = color[0];
                output[pixelIndex + 1] = color[1];
                output[pixelIndex + 2] = color[2];
            }
            output[pixelIndex + 3] = 255;
        }
    }
    ctx.putImageData(outputData, 0, 0);
};

export const hexToRgb = (hex: string): [number, number, number] | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : null;
};

// This function creates an animation sketch (genga) effect using a Sobel operator for better edge detection.
export const applyGengaEffect = (ctx: any, width: number, height: number, config: GengaConfig, improveQuality: boolean, lineThreshold: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;

    const outlineColor = config.outline === 'colorful' ? 'colorful' : hexToRgb(config.outline);
    const shadowColor = config.shadow === 'colorful' ? 'colorful' : hexToRgb(config.shadow);
    const highlightColor = config.highlight === 'colorful' ? 'colorful' : hexToRgb(config.highlight);

    const initialGrayValues = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        initialGrayValues[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    
    // Conditionally apply Gaussian blur for noise reduction
    const grayValues = improveQuality ? applyGaussianBlur(initialGrayValues, width, height) : initialGrayValues;
    
    for (let i = 0; i < output.length; i += 4) {
        output[i] = 255;
        output[i + 1] = 255;
        output[i + 2] = 255;
        output[i + 3] = 255;
    }

    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    const strongEdgeThreshold = 150; 

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gradX = 0;
            let gradY = 0;
            
            for (let j = -1; j <= 1; j++) {
                for (let i = -1; i <= 1; i++) {
                    const gray = grayValues[(y + j) * width + (x + i)];
                    gradX += gray * sobelX[j + 1][i + 1];
                    gradY += gray * sobelY[j + 1][i + 1];
                }
            }

            const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
            const outputIndex = (y * width + x) * 4;

            const drawPixel = (colorConfig: 'colorful' | [number, number, number] | null) => {
                if (!colorConfig) return;
                let finalColor: [number, number, number];
                if (colorConfig === 'colorful') {
                    finalColor = [data[outputIndex], data[outputIndex + 1], data[outputIndex + 2]];
                } else {
                    finalColor = colorConfig;
                }
                output[outputIndex] = finalColor[0];
                output[outputIndex + 1] = finalColor[1];
                output[outputIndex + 2] = finalColor[2];
            };

            if (magnitude > strongEdgeThreshold) {
                drawPixel(outlineColor);
            } else if (magnitude > lineThreshold) {
                const originalGray = initialGrayValues[y * width + x]; // Use original for shadow/highlight
                if (originalGray < 85) {
                    drawPixel(shadowColor);
                } else if (originalGray > 170) {
                    drawPixel(highlightColor);
                }
            }
        }
    }
    ctx.putImageData(outputData, 0, 0);
};

const UKIYOE_PALETTE: [number, number, number][] = [
    [243, 234, 212], // Off-white/cream
    [208, 160, 114], // Skin tone/light brown
    [104, 134, 149], // Muted blue
    [177, 78, 78],   // Muted red
    [60, 93, 85],    // Dark teal/green
    [22, 22, 22]     // Near-black for outlines
];

const findClosestColor = (r: number, g: number, b: number, palette: [number, number, number][]) => {
    let closestColor = palette[0];
    let minDistance = Infinity;
    for (const color of palette) {
        const distance = Math.sqrt(
            Math.pow(r - color[0], 2) +
            Math.pow(g - color[1], 2) +
            Math.pow(b - color[2], 2)
        );
        if (distance < minDistance) {
            minDistance = distance;
            closestColor = color;
        }
    }
    return closestColor;
};


export const applyUkiyoE_Effect = (ctx: any, width: number, height: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;

    const grayValues = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        grayValues[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }
    
    const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
    const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
    const edgeThreshold = 80;

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            let gradX = 0;
            let gradY = 0;

            for (let j = -1; j <= 1; j++) {
                for (let i = -1; i <= 1; i++) {
                    gradX += grayValues[(y + j) * width + (x + i)] * sobelX[j + 1][i + 1];
                    gradY += grayValues[(y + j) * width + (x + i)] * sobelY[j + 1][i + 1];
                }
            }

            const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
            const pixelIndex = (y * width + x) * 4;

            if (magnitude > edgeThreshold) {
                // Black outline for edges
                output[pixelIndex] = UKIYOE_PALETTE[5][0];
                output[pixelIndex + 1] = UKIYOE_PALETTE[5][1];
                output[pixelIndex + 2] = UKIYOE_PALETTE[5][2];
            } else {
                // Find closest color in palette
                const r = data[pixelIndex];
                const g = data[pixelIndex + 1];
                const b = data[pixelIndex + 2];
                const [pr, pg, pb] = findClosestColor(r, g, b, UKIYOE_PALETTE.slice(0, 5)); // Exclude black
                output[pixelIndex] = pr;
                output[pixelIndex + 1] = pg;
                output[pixelIndex + 2] = pb;
            }
            output[pixelIndex + 3] = 255;
        }
    }
    ctx.putImageData(outputData, 0, 0);
};

const EIGHT_BIT_PALETTE: [number, number, number][] = [
    [0, 0, 0],       // Black
    [255, 255, 255], // White
    [136, 0, 0],     // Dark Red
    [170, 255, 238], // Light Cyan
    [204, 68, 68],   // Red
    [0, 204, 85],    // Green
    [0, 0, 170],     // Dark Blue
    [238, 238, 119], // Yellow
    [221, 136, 85],  // Orange
    [102, 68, 0],    // Brown
    [255, 119, 119], // Light Red
    [51, 204, 204],  // Cyan
    [119, 119, 255], // Blue
    [255, 119, 255], // Magenta
    [119, 255, 119], // Light Green
    [170, 170, 170]  // Gray
];

export const apply8BitEffect = (ctx: any, width: number, height: number, pixelSize: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;

    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            let r_sum = 0, g_sum = 0, b_sum = 0, count = 0;

            for (let py = y; py < y + pixelSize && py < height; py++) {
                for (let px = x; px < x + pixelSize && px < width; px++) {
                    const i = (py * width + px) * 4;
                    r_sum += data[i];
                    g_sum += data[i + 1];
                    b_sum += data[i + 2];
                    count++;
                }
            }
            
            if (count === 0) continue;

            const r_avg = r_sum / count;
            const g_avg = g_sum / count;
            const b_avg = b_sum / count;
            
            const [pr, pg, pb] = findClosestColor(r_avg, g_avg, b_avg, EIGHT_BIT_PALETTE);

            for (let py = y; py < y + pixelSize && py < height; py++) {
                for (let px = x; px < x + pixelSize && px < width; px++) {
                    const i = (py * width + px) * 4;
                    output[i] = pr;
                    output[i + 1] = pg;
                    output[i + 2] = pb;
                    output[i + 3] = 255;
                }
            }
        }
    }
    ctx.putImageData(outputData, 0, 0);
};

export const applySilhouetteEffect = (ctx: any, width: number, height: number, threshold: number) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const outputData = ctx.createImageData(width, height);
    const output = outputData.data;

    const bgColor = [255, 255, 255]; // White

    for (let i = 0; i < data.length; i += 4) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];

        if (luminance < threshold) {
            output[i] = 0;
            output[i + 1] = 0;
            output[i + 2] = 0;
        } else {
            output[i] = bgColor[0];
            output[i + 1] = bgColor[1];
            output[i + 2] = bgColor[2];
        }
        output[i + 3] = 255;
    }
    ctx.putImageData(outputData, 0, 0);
};

const ASCII_CHARS_FULL = " `.'\"^,:;Il!i~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";

interface OutlineConfig {
    threshold: number;
}
interface TransparentBgConfig {
    threshold: number;
}

export const convertImageToAscii = (
    ctx: any, 
    canvasWidth: number, 
    canvasHeight: number, 
    asciiWidth: number, 
    outlineConfig?: OutlineConfig, 
    transparentBgConfig?: TransparentBgConfig,
    invert?: boolean
): string => {
    const charSet = invert ? ASCII_CHARS_FULL.split('').reverse().join('') : ASCII_CHARS_FULL;

    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const data = imageData.data;
    
    // Background Masking Calculation
    let bgMask: boolean[] | null = null;
    if (transparentBgConfig) {
        const bgColor = [data[0], data[1], data[2]];
        bgMask = new Array(canvasWidth * canvasHeight).fill(false);
        for (let i = 0; i < data.length; i += 4) {
            const distance = Math.sqrt(
                Math.pow(data[i] - bgColor[0], 2) + 
                Math.pow(data[i + 1] - bgColor[1], 2) + 
                Math.pow(data[i + 2] - bgColor[2], 2)
            );
            if (distance < transparentBgConfig.threshold) {
                bgMask[i / 4] = true;
            }
        }
    }
    
    let grayValues: Uint8ClampedArray;

    if (outlineConfig) {
        const originalGray = new Uint8ClampedArray(canvasWidth * canvasHeight);
        for (let i = 0; i < data.length; i += 4) {
            originalGray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }

        const lineArtGray = new Uint8ClampedArray(canvasWidth * canvasHeight).fill(255);
        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for (let y = 1; y < canvasHeight - 1; y++) {
            for (let x = 1; x < canvasWidth - 1; x++) {
                const currentPixelIndex = y * canvasWidth + x;
                if (bgMask && bgMask[currentPixelIndex]) {
                    continue; 
                }
                
                let gradX = 0, gradY = 0;
                for (let j = -1; j <= 1; j++) {
                    for (let i = -1; i <= 1; i++) {
                        const gray = originalGray[(y + j) * canvasWidth + (x + i)];
                        gradX += gray * sobelX[j + 1][i + 1];
                        gradY += gray * sobelY[j + 1][i + 1];
                    }
                }
                const magnitude = Math.sqrt(gradX * gradX + gradY * gradY);
                if (magnitude > outlineConfig.threshold) {
                    lineArtGray[currentPixelIndex] = 0;
                }
            }
        }
        grayValues = lineArtGray;
    } else {
        grayValues = new Uint8ClampedArray(canvasWidth * canvasHeight);
        for (let i = 0; i < data.length; i += 4) {
            grayValues[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
    }
    
    const characterAspectRatio = 0.5; // Approximation for standard fonts
    const asciiHeight = Math.floor(asciiWidth * (canvasHeight / canvasWidth) * characterAspectRatio);
    
    if (asciiHeight === 0 || asciiWidth === 0) return '';
    
    const blockWidth = canvasWidth / asciiWidth;
    const blockHeight = canvasHeight / asciiHeight;

    let asciiArt = '';

    for (let y = 0; y < asciiHeight; y++) {
        for (let x = 0; x < asciiWidth; x++) {
            const startX = Math.floor(x * blockWidth);
            const startY = Math.floor(y * blockHeight);
            
            let totalGray = 0;
            let pixelCount = 0;
            let bgPixelCount = 0;
            
            for (let blockY = 0; blockY < Math.ceil(blockHeight); blockY++) {
                for (let blockX = 0; blockX < Math.ceil(blockWidth); blockX++) {
                    const pixelX = startX + blockX;
                    const pixelY = startY + blockY;
                    
                    if (pixelX < canvasWidth && pixelY < canvasHeight) {
                        const index = pixelY * canvasWidth + pixelX;
                        totalGray += grayValues[index];
                        pixelCount++;
                        if (bgMask && bgMask[index]) {
                            bgPixelCount++;
                        }
                    }
                }
            }

            if (pixelCount === 0) continue;

            if (bgMask && (bgPixelCount / pixelCount > 0.5)) {
                 asciiArt += ' ';
                 continue;
            }

            const avgGray = totalGray / pixelCount;
            const charIndex = Math.floor((avgGray / 255) * (charSet.length - 1));
            const char = charSet[charIndex] || ' ';
            asciiArt += char;
        }
        asciiArt += '\n';
    }
    return asciiArt;
};

// Renders Colored ASCII art directly to the canvas as an image
export const applyColoredAsciiEffect = (
    ctx: any, 
    width: number, 
    height: number, 
    asciiWidth: number,
    invert: boolean = false,
    outlineConfig?: OutlineConfig,
    transparentBgConfig?: TransparentBgConfig
) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    const charSet = invert ? ASCII_CHARS_FULL.split('').reverse().join('') : ASCII_CHARS_FULL;

    const characterAspectRatio = 0.6; // Better for canvas rendering of monospace fonts
    const asciiHeight = Math.floor(asciiWidth * (height / width) * characterAspectRatio);
    
    const blockWidth = width / asciiWidth;
    const blockHeight = height / asciiHeight;

    // Background mask pre-calculation
    let bgMask: boolean[] | null = null;
    if (transparentBgConfig) {
        const bgColor = [data[0], data[1], data[2]];
        bgMask = new Array(width * height).fill(false);
        for (let i = 0; i < data.length; i += 4) {
            const distance = Math.sqrt(
                Math.pow(data[i] - bgColor[0], 2) + 
                Math.pow(data[i + 1] - bgColor[1], 2) + 
                Math.pow(data[i + 2] - bgColor[2], 2)
            );
            if (distance < transparentBgConfig.threshold) {
                bgMask[i / 4] = true;
            }
        }
    }

    // Outline pre-calculation
    let edgeMap: boolean[] | null = null;
    if (outlineConfig) {
        edgeMap = new Array(width * height).fill(false);
        const gray = new Uint8ClampedArray(width * height);
        for(let i=0; i<data.length; i+=4) gray[i/4] = 0.299*data[i] + 0.587*data[i+1] + 0.114*data[i+2];

        const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
        const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                if (bgMask && bgMask[y * width + x]) continue;

                let gradX = 0, gradY = 0;
                for (let j = -1; j <= 1; j++) {
                    for (let i = -1; i <= 1; i++) {
                        const val = gray[(y + j) * width + (x + i)];
                        gradX += val * sobelX[j + 1][i + 1];
                        gradY += val * sobelY[j + 1][i + 1];
                    }
                }
                if (Math.sqrt(gradX * gradX + gradY * gradY) > outlineConfig.threshold) {
                    edgeMap[y * width + x] = true;
                }
            }
        }
    }

    // Draw background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    
    // Config font
    const fontSize = blockHeight; 
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    for (let y = 0; y < asciiHeight; y++) {
        for (let x = 0; x < asciiWidth; x++) {
            const startX = Math.floor(x * blockWidth);
            const startY = Math.floor(y * blockHeight);
            
            let r_sum = 0, g_sum = 0, b_sum = 0;
            let pixelCount = 0;
            let bgPixelCount = 0;
            let edgePixelCount = 0;

            // Sample the block
            for (let blockY = 0; blockY < Math.ceil(blockHeight); blockY++) {
                for (let blockX = 0; blockX < Math.ceil(blockWidth); blockX++) {
                    const pixelX = startX + blockX;
                    const pixelY = startY + blockY;
                    
                    if (pixelX < width && pixelY < height) {
                        const idx = pixelY * width + pixelX;
                        const i = idx * 4;
                        r_sum += data[i];
                        g_sum += data[i+1];
                        b_sum += data[i+2];
                        pixelCount++;

                        if (bgMask && bgMask[idx]) bgPixelCount++;
                        if (edgeMap && edgeMap[idx]) edgePixelCount++;
                    }
                }
            }

            if (pixelCount === 0) continue;

            // Transparency Check
            if (bgMask && (bgPixelCount / pixelCount > 0.5)) {
                continue; // Do not draw anything (transparent)
            }

            const r = Math.round(r_sum / pixelCount);
            const g = Math.round(g_sum / pixelCount);
            const b = Math.round(b_sum / pixelCount);
            
            // If it's an edge block, use darker/dense char logic if Outline mode is on
            // Or simply pick the character based on brightness, but maybe force black color or high contrast?
            // convertImageToAscii forces the gray value to 0 (black).
            // Here, we want to keep the color but pick a dense character.
            
            let avgGray = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if (edgeMap && (edgePixelCount > 0)) {
                // Determine edge character - simply map a dark value
                // In inverted mode (dark background), edges are usually light, so high value.
                // In normal mode (light background in convertImageToAscii logic), edges are black (0).
                // Let's assume we want "dense" characters for edges.
                // charSet is ordered light -> dark. 
                // So index 0 is space, index last is @.
                // To get dense char, we want high index.
                // avgGray/255 -> 0..1. 
                // We want to force a dense char.
                avgGray = 0; // Black is dense? wait.
                // In standard mapping: 0 (black) -> '@' (last index) if NOT inverted.
                // The provided code: charIndex = (avgGray / 255) * (len - 1).
                // ASCII_CHARS_FULL starts with space (light).
                // So 255 (white) -> space. 0 (black) -> @.
                // So yes, setting avgGray to 0 forces a dense character.
            }

            const charIndex = Math.floor((avgGray / 255) * (charSet.length - 1));
            const char = charSet[charIndex] || ' ';

            // Draw the colored character
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillText(char, startX, startY);
        }
    }
};