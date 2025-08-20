const puppeteer = require('puppeteer');
const puppeteerCore = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuration for API endpoints
const API_CONFIG = {
    template: {
        baseUrl: process.env.BACKEND_URL + '/api/image',
        endpoint: '/get_template_image'
    },
    cloud: {
        baseUrl: process.env.BACKEND_URL + '/api/image',
        endpoint: '/get_image_by_name'
    }
};

/**
 * Download image from API endpoint and convert to base64
 * @param {string} imageUrl - Full URL to download image
 * @param {string} imageName - Name of the image for error reporting
 * @returns {Promise<string>} Base64 encoded image data URL
 */
async function downloadImageToBase64(imageUrl, imageName) {
    try {
        console.log(`Downloading image: ${imageName} from ${imageUrl}`);

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 30000, // 30 second timeout
            headers: {
                'User-Agent': 'PDF-Generator/1.0'
            }
        });

        const buffer = Buffer.from(response.data);

        // Determine MIME type from response headers or file extension
        let mimeType = response.headers['content-type'];
        if (!mimeType) {
            const ext = path.extname(imageName).toLowerCase();
            switch (ext) {
                case '.png': mimeType = 'image/png'; break;
                case '.jpg':
                case '.jpeg': mimeType = 'image/jpeg'; break;
                case '.svg': mimeType = 'image/svg+xml'; break;
                case '.gif': mimeType = 'image/gif'; break;
                case '.webp': mimeType = 'image/webp'; break;
                default: mimeType = 'image/png';
            }
        }

        const base64 = buffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64}`;

        console.log(`Successfully downloaded and converted: ${imageName} (${(buffer.length / 1024).toFixed(2)}KB)`);
        return dataUrl;

    } catch (error) {
        console.error(`Error downloading image ${imageName}:`, error.message);
        throw new Error(`Failed to download image ${imageName}: ${error.message}`);
    }
}

/**
 * Process image element and convert src to base64
 * @param {Object} element - Image element from JSON
 * @returns {Promise<Object>} Processed element with base64 src
 */
async function processImageElement(element) {
    if (element.type !== 'image' || !element.properties?.src) {
        return element;
    }

    const src = element.properties.src;
    let imageUrl;
    let imageName;

    try {
        // Handle template images (template://)
        if (src.startsWith('template://')) {
            imageName = src.replace('template://', '');
            imageUrl = `${API_CONFIG.template.baseUrl}${API_CONFIG.template.endpoint}/${imageName}`;
        }
        // Handle cloud images (cloud://)
        else if (src.startsWith('cloud://')) {
            imageName = src.replace('cloud://', '');
            imageUrl = `${API_CONFIG.cloud.baseUrl}${API_CONFIG.cloud.endpoint}/${imageName}`;
        }
        // Skip data URLs and other formats
        else {
            return element;
        }

        // Download and convert to base64
        const base64Src = await downloadImageToBase64(imageUrl, imageName);

        return {
            ...element,
            properties: {
                ...element.properties,
                src: base64Src,
                originalSrc: src // Keep original for reference
            }
        };

    } catch (error) {
        console.error(`Error processing image element:`, error.message);
        // Return element unchanged if image download fails
        return {
            ...element,
            properties: {
                ...element.properties,
                downloadError: error.message
            }
        };
    }
}

/**
 * Process project JSON and convert all images to base64
 * @param {Object} project - Project JSON
 * @returns {Promise<Object>} Processed project with base64 images
 */
async function processProjectImages(project) {
    const processedProject = { ...project };

    // Process all pages
    if (processedProject.pages && Array.isArray(processedProject.pages)) {
        processedProject.pages = await Promise.all(
            processedProject.pages.map(async (page) => {
                if (page.elements && Array.isArray(page.elements)) {
                    // Process all elements in parallel for better performance
                    page.elements = await Promise.all(
                        page.elements.map(processImageElement)
                    );
                }
                return page;
            })
        );
    }

    return processedProject;
}

/**
 * Generate HTML content from processed project
 * @param {Object} project - Processed project with base64 images
 * @returns {string} HTML content for PDF generation
 */
function generateHTMLFromProject(project) {
    const pages = project.pages || [];

    const pageContent = pages.map((page, pageIndex) => {
        const pageSettings = page.pageSettings || { width: 800, height: 600 };
        const elements = page.elements || [];

        // Sort elements by z-index
        const sortedElements = elements.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        // Generate background style
        let backgroundStyle = '';
        if (page.pageSettings?.background) {
            const bg = page.pageSettings.background;
            if (bg.type === 'color') {
                backgroundStyle = `background-color: ${bg.value};`;
            } else if (bg.type === 'gradient') {
                backgroundStyle = `background: ${bg.value};`;
            } else if (bg.type === 'image') {
                backgroundStyle = `
          background-image: url('${bg.value}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        `;
            } else if (bg.type === 'svg') {
                const encodedSvg = encodeURIComponent(bg.value);
                backgroundStyle = `
          background-image: url('data:image/svg+xml;charset=utf-8,${encodedSvg}');
          background-size: cover;
          background-position: center;
          background-repeat: no-repeat;
        `;
            }
        }

        // Generate elements HTML
        const elementsHTML = sortedElements.map(element => {
            if (element.type === 'text') {
                const props = element.properties || {};
                const fontSize = props.fontSize || 16;
                const lineHeight = props.lineHeight || 1.2;
                const textAlign = props.textAlign || 'left';

                let textContent = props.text || '';
                if (props.listStyle === 'bullet') {
                    const lines = textContent.split('\n').filter(line => line.trim() !== '');
                    textContent = lines.map(line => `• ${line}`).join('<br>');
                } else {
                    textContent = textContent.replace(/\n/g, '<br>');
                }

                const containerStyle = `
          position: absolute;
          left: ${Math.round(element.x || 0)}px;
          top: ${Math.round(element.y || 0)}px;
          width: ${Math.round(element.width || 100)}px;
          height: ${Math.round(element.height || 30)}px;
          z-index: ${element.zIndex || 1};
          transform: rotate(${element.rotation || 0}deg);
          transform-origin: center;
          box-sizing: border-box;
          overflow: hidden;
        `;

                const textStyle = `
          font-size: ${fontSize}px;
          font-family: '${props.fontFamily || 'Arial'}', sans-serif;
          color: ${props.color || '#000000'};
          font-weight: ${props.bold ? 'bold' : 'normal'};
          font-style: ${props.italic ? 'italic' : 'normal'};
          text-align: ${textAlign};
          text-decoration: ${props.underline ? 'underline' : 'none'};
          line-height: ${lineHeight};
          letter-spacing: ${(props.letterSpacing || 0)}px;
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          box-sizing: border-box;
          word-wrap: break-word;
          white-space: pre-wrap;
        `;

                return `
          <div style="${containerStyle}">
            <div style="${textStyle}">${textContent}</div>
          </div>
        `;
            }
            else if (element.type === 'image') {
                const props = element.properties || {};

                // Show error message if image failed to download
                if (props.downloadError) {
                    return `
            <div style="
              position: absolute;
              left: ${Math.round(element.x)}px;
              top: ${Math.round(element.y)}px;
              width: ${Math.round(element.width)}px;
              height: ${Math.round(element.height)}px;
              z-index: ${element.zIndex || 1};
              background-color: #f0f0f0;
              border: 2px dashed #ccc;
              display: flex;
              align-items: center;
              justify-content: center;
              font-family: Arial, sans-serif;
              font-size: 12px;
              color: #666;
              text-align: center;
              padding: 10px;
              box-sizing: border-box;
            ">
              Image load failed<br><small>${props.downloadError}</small>
            </div>
          `;
                }

                // Compose transform for rotation and flip
                const transforms = [];
                if (props.flipHorizontal) {
                    transforms.push('scaleX(-1)');
                }
                if (props.flipVertical) {
                    transforms.push('scaleY(-1)');
                }
                if (element.rotation && element.rotation !== 0) {
                    transforms.push(`rotate(${element.rotation}deg)`);
                }
                const transformStyle = transforms.length > 0 ? transforms.join(' ') : 'none';
                const borderRadius = props.borderRadius || 0;

                return `
          <div style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            z-index: ${element.zIndex || 1};
            overflow: hidden;
          ">
            <img src="${props.src}" 
                 alt="Image"
                 style="
                   width: 100%;
                   height: 100%;
                   object-fit: ${props.fit === 'stretch' ? 'fill' :
                        props.fit === 'scale-down' ? 'scale-down' :
                            (props.fit || 'contain')};
                   display: block;
                   border-radius: ${borderRadius}px;
                   transform: ${transformStyle};
                 " 
            />
          </div>
        `;
            }
            else if (element.type === 'svg') {
                const props = element.properties || {};
                let svgContent = props.svgContent || '';

                // Ensure SVG has proper dimensions
                if (!svgContent.includes('viewBox') && !svgContent.includes('width=') && !svgContent.includes('height=')) {
                    svgContent = svgContent.replace('<svg', `<svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}"`);
                }

                return `
          <div style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            z-index: ${element.zIndex || 1};
            transform: rotate(${element.rotation || 0}deg);
            transform-origin: center;
            overflow: hidden;
          ">
            ${svgContent}
          </div>
        `;
            }
            else if (element.type === 'shape') {
                const props = element.properties || {};
                const {
                    fill = '#f3f4f6',
                    stroke = '#111827',
                    strokeWidth = 2,
                    opacity = 1,
                    rx = 0,
                    strokeDasharray = 'none',
                    shadow = false,
                    shadowBlur = 0,
                    shadowColor = '#000',
                } = props;

                const shapeType = element.shapeType || 'rectangle';
                let svgContent = '';

                // Generate SVG content based on shape type
                switch (shapeType) {
                    case 'rectangle':
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <rect
                  x="${(strokeWidth || 0) / 2}"
                  y="${(strokeWidth || 0) / 2}"
                  width="${element.width - (strokeWidth || 0)}"
                  height="${element.height - (strokeWidth || 0)}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  rx="${rx}"
                  ry="${rx}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    case 'ellipse':
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <ellipse
                  cx="${element.width / 2}"
                  cy="${element.height / 2}"
                  rx="${(element.width - (strokeWidth || 0)) / 2}"
                  ry="${(element.height - (strokeWidth || 0)) / 2}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    case 'triangle': {
                        const w = element.width, h = element.height;
                        const strokeOffset = (strokeWidth || 0);
                        const points = `${w / 2},${strokeOffset} ${w - strokeOffset},${h - strokeOffset} ${strokeOffset},${h - strokeOffset}`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'diamond': {
                        const points = `${element.width / 2},0 ${element.width},${element.height / 2} ${element.width / 2},${element.height} 0,${element.height / 2}`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'hexagon': {
                        const w = element.width, h = element.height;
                        const strokeOffset = (strokeWidth || 0);
                        const points = [
                            [w * 0.25 + strokeOffset, strokeOffset],
                            [w * 0.75 - strokeOffset, strokeOffset],
                            [w - strokeOffset, h / 2],
                            [w * 0.75 - strokeOffset, h - strokeOffset],
                            [w * 0.25 + strokeOffset, h - strokeOffset],
                            [strokeOffset, h / 2]
                        ].map(p => p.join(',')).join(' ');
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'pentagon': {
                        const spikes = 5;
                        const w = element.width, h = element.height;
                        const cx = w / 2;
                        const cy = h / 2;
                        const outerRadiusX = w / 2;
                        const outerRadiusY = h / 2;
                        const innerRadiusX = w / 2.5;
                        const innerRadiusY = h / 2.5;
                        let points = '';
                        for (let i = 0; i < spikes * 2; i++) {
                            const isOuter = i % 2 === 0;
                            const angle = (Math.PI / spikes) * i - Math.PI / 2;
                            const rX = isOuter ? outerRadiusX : innerRadiusX;
                            const rY = isOuter ? outerRadiusY : innerRadiusY;
                            points += `${cx + rX * Math.cos(angle)},${cy + rY * Math.sin(angle)} `;
                        }
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points.trim()}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'octagon': {
                        const r = Math.min(element.width, element.height) / 2;
                        const cx = element.width / 2;
                        const cy = element.height / 2;
                        const points = Array.from({ length: 8 }).map((_, i) => {
                            const angle = (Math.PI / 8) + (i * 2 * Math.PI / 8);
                            return `${cx + r * Math.cos(angle)},${cy - r * Math.sin(angle)}`;
                        }).join(' ');
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'star': {
                        const spikes = 5;
                        const w = element.width, h = element.height;
                        const cx = w / 2;
                        const cy = h / 2;
                        const strokeOffset = (strokeWidth || 0);
                        const outerRadiusX = (w / 2) - strokeOffset;
                        const outerRadiusY = (h / 2) - strokeOffset;
                        const innerRatio = 0.382;
                        const innerRadiusX = outerRadiusX * innerRatio;
                        const innerRadiusY = outerRadiusY * innerRatio;
                        let points = '';
                        for (let i = 0; i < spikes * 2; i++) {
                            const isOuter = i % 2 === 0;
                            const angle = (Math.PI / spikes) * i - Math.PI / 2;
                            const rX = isOuter ? outerRadiusX : innerRadiusX;
                            const rY = isOuter ? outerRadiusY : innerRadiusY;
                            points += `${cx + rX * Math.cos(angle)},${cy + rY * Math.sin(angle)} `;
                        }
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points.trim()}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'line': {
                        const w = element.width, h = element.height;
                        let lineStroke = stroke;
                        if (!lineStroke || lineStroke === 'none' || lineStroke === '#00000000' || lineStroke === 'transparent') {
                            lineStroke = '#111827';
                        }
                        const lineStrokeWidth = !strokeWidth || strokeWidth === 0 ? 2 : strokeWidth;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <line
                  x1="0"
                  y1="${h / 2}"
                  x2="${w}"
                  y2="${h / 2}"
                  stroke="${lineStroke}"
                  stroke-width="${lineStrokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'parallelogram': {
                        const offset = element.width * 0.2;
                        const points = `${offset},0 ${element.width},0 ${element.width - offset},${element.height} 0,${element.height}`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'trapezoid': {
                        const offset = element.width * 0.2;
                        const points = `${offset},0 ${element.width - offset},0 ${element.width},${element.height} 0,${element.height}`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'chevron': {
                        const offset = element.width * 0.2;
                        const points = `0,0 ${element.width - offset},0 ${element.width},${element.height / 2} ${element.width - offset},${element.height} 0,${element.height} ${offset},${element.height / 2}`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'bookmark': {
                        const w = element.width;
                        const h = element.height;
                        const path = `M0,0 H${w} V${h} L${w / 2},${h * 0.7} L0,${h} Z`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <path
                  d="${path}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'heart': {
                        const w = element.width, h = element.height;
                        const path = `M ${w / 2},${h * 0.8} C ${w * 0.05},${h * 0.55} ${w * 0.2},${h * 0.05} ${w / 2},${h * 0.3} C ${w * 0.8},${h * 0.05} ${w * 0.95},${h * 0.55} ${w / 2},${h * 0.8} Z`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <path
                  d="${path}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'cloud': {
                        const w = element.width, h = element.height;
                        const path = `M${w * 0.25},${h * 0.7} Q0,${h * 0.7} 0,${h * 0.5} Q0,${h * 0.3} ${w * 0.2},${h * 0.3} Q${w * 0.25},0 ${w * 0.5},${h * 0.1} Q${w * 0.75},0 ${w * 0.8},${h * 0.3} Q${w},${h * 0.3} ${w},${h * 0.5} Q${w},${h * 0.7} ${w * 0.75},${h * 0.7} Z`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <path
                  d="${path}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'sun': {
                        const w = element.width, h = element.height;
                        const cx = w / 2, cy = h / 2, r = Math.min(w, h) * 0.25;
                        const rays = Array.from({ length: 12 }).map((_, i) => {
                            const angle = (i * 2 * Math.PI) / 12;
                            const x1 = cx + Math.cos(angle) * r;
                            const y1 = cy + Math.sin(angle) * r;
                            const x2 = cx + Math.cos(angle) * r * 1.5;
                            const y2 = cy + Math.sin(angle) * r * 1.5;
                            return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth / 2}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>`;
                        }).join('');
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                ${rays}
              </svg>
            `;
                        break;
                    }
                    case 'crescent': {
                        const w = element.width, h = element.height;
                        const cx = w / 2;
                        const cy = h / 2;
                        const r = Math.min(w, h) / 2 * 0.9;
                        const d = r * 0.4;
                        const intersectY = Math.sqrt(r * r - d * d);
                        const path = `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx + d} ${cy - intersectY} A ${r} ${r} 0 0 0 ${cx + d} ${cy + intersectY} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r} Z`;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <path
                  d="${path}"
                  fill="${fill}"
                  fill-rule="nonzero"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'speechBubble': {
                        const w = element.width, h = element.height;
                        const radius = Math.min(w, h) * 0.1;
                        const tailSize = Math.min(w, h) * 0.15;
                        const bubbleHeight = h - tailSize;
                        const path = `M${radius},0 L${w - radius},0 Q${w},0 ${w},${radius} L${w},${bubbleHeight - radius} Q${w},${bubbleHeight} ${w - radius},${bubbleHeight} L${w * 0.3},${bubbleHeight} L${w * 0.2},${h} L${w * 0.25},${bubbleHeight} L${radius},${bubbleHeight} Q0,${bubbleHeight} 0,${bubbleHeight - radius} L0,${radius} Q0,0 ${radius},0 Z`;
                        svgContent = `
              <svg viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;" preserveAspectRatio="none">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <path
                  d="${path}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'arrow': {
                        const w = element.width, h = element.height;
                        const strokeOffset = (strokeWidth || 0) / 2;
                        const arrowHeadSize = Math.max(10, h * 0.15);
                        const shaftEnd = w - arrowHeadSize;
                        const arrowTip = w + arrowHeadSize;
                        const arrowTop = h / 2 - arrowHeadSize / 2;
                        const arrowBottom = h / 2 + arrowHeadSize / 2;
                        svgContent = `
              <svg viewBox="0 0 ${w + arrowHeadSize} ${h}" style="width: 100%; height: 100%;" preserveAspectRatio="none">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <line x1="${strokeOffset}" y1="${h / 2}" x2="${w}" y2="${h / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                <line x1="${shaftEnd}" y1="${arrowTop}" x2="${arrowTip}" y2="${h / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                <line x1="${shaftEnd}" y1="${arrowBottom}" x2="${arrowTip}" y2="${h / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
              </svg>
            `;
                        break;
                    }
                    case 'rightArrow': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.15, h * 0.35],
                            [w * 0.7, h * 0.35],
                            [w * 0.7, 0],
                            [w, h / 2],
                            [w * 0.7, h],
                            [w * 0.7, h * 0.65],
                            [w * 0.15, h * 0.65]
                        ].map(p => p.join(",")).join(" ");
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray && strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'leftArrow': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.85, h * 0.35],
                            [w * 0.3, h * 0.35],
                            [w * 0.3, 0],
                            [0, h / 2],
                            [w * 0.3, h],
                            [w * 0.3, h * 0.65],
                            [w * 0.85, h * 0.65]
                        ].map(p => p.join(",")).join(" ");
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray && strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'upArrow': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.35, h * 0.85],
                            [w * 0.35, h * 0.3],
                            [0, h * 0.3],
                            [w / 2, 0],
                            [w, h * 0.3],
                            [w * 0.65, h * 0.3],
                            [w * 0.65, h * 0.85]
                        ].map(p => p.join(",")).join(" ");
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray && strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'downArrow': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.35, h * 0.15],
                            [w * 0.35, h * 0.7],
                            [0, h * 0.7],
                            [w / 2, h],
                            [w, h * 0.7],
                            [w * 0.65, h * 0.7],
                            [w * 0.65, h * 0.15]
                        ].map(p => p.join(",")).join(" ");
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray && strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'lightning': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.4, 0],
                            [w * 0.6, 0],
                            [w * 0.5, h * 0.4],
                            [w * 0.7, h * 0.4],
                            [w * 0.3, h],
                            [w * 0.4, h * 0.6],
                            [w * 0.3, h * 0.6]
                        ].map(p => p.join(',')).join(' ');
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polygon
                  points="${points}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    case 'plus': {
                        const w = element.width, h = element.height;
                        const lineLength = 0.6;
                        const verticalStart = h * (1 - lineLength) / 2;
                        const verticalEnd = h * (1 + lineLength) / 2;
                        const horizontalStart = w * (1 - lineLength) / 2;
                        const horizontalEnd = w * (1 + lineLength) / 2;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <line x1="${w / 2}" y1="${verticalStart}" x2="${w / 2}" y2="${verticalEnd}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                <line x1="${horizontalStart}" y1="${h / 2}" x2="${horizontalEnd}" y2="${h / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
              </svg>
            `;
                        break;
                    }
                    case 'minus': {
                        const w = element.width, h = element.height;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <line x1="${w * 0.2}" y1="${h / 2}" x2="${w * 0.8}" y2="${h / 2}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
              </svg>
            `;
                        break;
                    }
                    case 'exclamation': {
                        const w = element.width, h = element.height;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <rect x="${w / 2 - 2}" y="${h * 0.2}" width="4" height="${h * 0.5}" fill="${stroke}" opacity="${opacity}" ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                <circle cx="${w / 2}" cy="${h * 0.8}" r="4" fill="${stroke}" opacity="${opacity}" ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
              </svg>
            `;
                        break;
                    }
                    case 'cross': {
                        const w = element.width, h = element.height;
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <line x1="${w * 0.2}" y1="${h * 0.2}" x2="${w * 0.8}" y2="${h * 0.8}" stroke="${stroke}" stroke-width="${strokeWidth * 2}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
                <line x1="${w * 0.8}" y1="${h * 0.2}" x2="${w * 0.2}" y2="${h * 0.8}" stroke="${stroke}" stroke-width="${strokeWidth * 2}" opacity="${opacity}" ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''} ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}/>
              </svg>
            `;
                        break;
                    }
                    case 'checkmark': {
                        const w = element.width, h = element.height;
                        const points = [
                            [w * 0.05, h * 0.55],
                            [w * 0.4, h * 0.95],
                            [w * 0.95, h * 0.05]
                        ].map(p => p.join(',')).join(' ');
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${w} ${h}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <polyline
                  points="${points}"
                  fill="none"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth * 2}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                        break;
                    }
                    // Add more shape types as needed
                    default:
                        // Default to rectangle for unknown shapes
                        svgContent = `
              <svg width="100%" height="100%" viewBox="0 0 ${element.width} ${element.height}" style="width: 100%; height: 100%;">
                ${shadow && shadowBlur > 0 ? `<defs><filter id="shape-shadow-${element.id}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="0" stdDeviation="${shadowBlur}" floodColor="${shadowColor}" floodOpacity="1" /></filter></defs>` : ''}
                <rect
                  x="${(strokeWidth || 0) / 2}"
                  y="${(strokeWidth || 0) / 2}"
                  width="${element.width - (strokeWidth || 0)}"
                  height="${element.height - (strokeWidth || 0)}"
                  fill="${fill}"
                  stroke="${stroke}"
                  stroke-width="${strokeWidth}"
                  rx="${rx}"
                  ry="${rx}"
                  opacity="${opacity}"
                  ${strokeDasharray !== 'none' ? `stroke-dasharray="${strokeDasharray}"` : ''}
                  ${shadow && shadowBlur > 0 ? `filter="url(#shape-shadow-${element.id})"` : ''}
                />
              </svg>
            `;
                }

                return `
          <div style="
            position: absolute;
            left: ${Math.round(element.x)}px;
            top: ${Math.round(element.y)}px;
            width: ${Math.round(element.width)}px;
            height: ${Math.round(element.height)}px;
            z-index: ${element.zIndex || 1};
            transform: rotate(${element.rotation || 0}deg);
            transform-origin: center;
            overflow: hidden;
          ">
            ${svgContent}
          </div>
        `;
            }

            return '';
        }).join('');

        return `
      <div class="page" style="
        position: relative;
        width: ${pageSettings.width}px;
        height: ${pageSettings.height}px;
        ${backgroundStyle}
        margin: 0;
        padding: 0;
        box-sizing: border-box;
        overflow: hidden;
        page-break-after: ${pageIndex < pages.length - 1 ? 'always' : 'auto'};
        page-break-inside: avoid;
      ">
        ${elementsHTML}
      </div>
    `;
    }).join('');

    const firstPageSettings = pages[0]?.pageSettings || { width: 800, height: 600 };

    return `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Generated PDF</title>
        <meta charset="UTF-8">
        <style>
          @page {
            margin: 0;
            padding: 0;
            size: ${firstPageSettings.width}px ${firstPageSettings.height}px;
          }
          
          * {
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            font-family: Arial, sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          
          .page {
            position: relative;
            display: block;
          }
          
          img {
            max-width: 100%;
            height: auto;
          }
          
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            
            .page {
              page-break-inside: avoid !important;
            }
          }
        </style>
      </head>
      <body>
        ${pageContent}
      </body>
    </html>
  `;
}

/**
 * Get browser launch options based on environment
 * @returns {Object} Browser launch options and puppeteer instance
 */
async function getBrowserOptions() {
    // Check if we're in a serverless environment
    const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === 'production';

    console.log('Environment detection:');
    console.log('- VERCEL:', process.env.VERCEL);
    console.log('- AWS_LAMBDA_FUNCTION_NAME:', process.env.AWS_LAMBDA_FUNCTION_NAME);
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- isServerless:', isServerless);

    if (isServerless) {
        // Use serverless-compatible Chrome with puppeteer-core
        console.log('Using serverless Chrome configuration...');

        try {
            const executablePath = await chromium.executablePath();
            console.log('Chromium executable path:', executablePath);

            // Check if executable exists and is accessible
            try {
                if (!fs.existsSync(executablePath)) {
                    throw new Error(`Chromium executable not found at ${executablePath}`);
                }
                console.log('Chromium executable exists and is accessible');
            } catch (fsError) {
                console.warn('File system check failed:', fsError.message);
            }

            // Enhanced serverless configuration for Vercel
            const serverlessArgs = [
                ...chromium.args,
                '--allow-pre-commit-input',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-breakpad',
                '--disable-client-side-phishing-detection',
                '--disable-component-extensions-with-background-pages',
                '--disable-component-update',
                '--disable-default-apps',
                '--disable-dev-shm-usage',
                '--disable-extensions',
                '--disable-hang-monitor',
                '--disable-ipc-flooding-protection',
                '--disable-popup-blocking',
                '--disable-prompt-on-repost',
                '--disable-renderer-backgrounding',
                '--disable-sync',
                '--enable-automation',
                '--enable-blink-features=IdleDetection',
                '--export-tagged-pdf',
                '--force-color-profile=srgb',
                '--metrics-recording-only',
                '--no-first-run',
                '--password-store=basic',
                '--use-mock-keychain',
                '--disable-domain-reliability',
                '--disable-print-preview',
                '--disable-speech-api',
                '--disk-cache-size=33554432',
                '--mute-audio',
                '--no-default-browser-check',
                '--no-pings',
                '--single-process',
                '--font-render-hinting=none',
                '--disable-features=Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints,AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
                '--enable-features=NetworkServiceInProcess2,SharedArrayBuffer',
                '--hide-scrollbars',
                '--ignore-gpu-blocklist',
                '--in-process-gpu',
                '--window-size=1920,1080',
                '--use-gl=angle',
                '--use-angle=swiftshader',
                '--allow-running-insecure-content',
                '--disable-setuid-sandbox',
                '--disable-site-isolation-trials',
                '--disable-web-security',
                '--no-sandbox',
                '--no-zygote',
                '--headless=shell'
            ];

            return {
                puppeteer: puppeteerCore,
                options: {
                    args: serverlessArgs,
                    defaultViewport: chromium.defaultViewport,
                    executablePath: executablePath,
                    headless: 'shell',
                    ignoreHTTPSErrors: true,
                }
            };
        } catch (chromiumError) {
            console.error('Error getting chromium executable path:', chromiumError);
            console.log('Falling back to regular puppeteer...');

            // Fallback to regular puppeteer if chromium fails
            return {
                puppeteer: puppeteer,
                options: {
                    headless: true,
                    args: [
                        '--no-sandbox',
                        '--disable-setuid-sandbox',
                        '--disable-web-security',
                        '--disable-features=VizDisplayCompositor',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--single-process',
                        '--no-zygote'
                    ]
                }
            };
        }
    } else {
        // For local development, use regular puppeteer
        console.log('Using local Puppeteer configuration...');
        return {
            puppeteer: puppeteer,
            options: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            }
        };
    }
}

/**
 * Generate PDF from project JSON
 * @param {Object} project - Project JSON
 * @returns {Promise<Buffer>} PDF buffer
 */
async function generatePDF(req, res) {
    const { project } = req.body;
    console.log("Project: ", project);
    try {
        console.log('Starting PDF generation...');

        // Process images and convert to base64
        console.log('Processing images...');
        const processedProject = await processProjectImages(project);

        // Generate HTML content
        console.log('Generating HTML content...');
        const htmlContent = generateHTMLFromProject(processedProject);

        // Try multiple PDF generation methods
        let pdfBuffer;

        // Method 1: Try standard puppeteer first
        try {
            console.log('Trying standard puppeteer...');
            pdfBuffer = await generatePDFWithStandardPuppeteer(htmlContent, processedProject);
            console.log('PDF generated successfully with standard puppeteer');
        } catch (error1) {
            console.log('Standard puppeteer failed:', error1.message);
            console.log('Trying chromium fallback...');

            // Method 2: Try chromium fallback
            try {
                pdfBuffer = await generatePDFWithChromiumFallback(htmlContent, processedProject);
                console.log('PDF generated successfully with chromium fallback');
            } catch (error2) {
                console.log('Chromium fallback failed:', error2.message);
                console.log('Trying minimal puppeteer configuration...');

                // Method 3: Try minimal puppeteer configuration
                try {
                    pdfBuffer = await generatePDFWithMinimalPuppeteer(htmlContent, processedProject);
                    console.log('PDF generated successfully with minimal puppeteer');
                } catch (error3) {
                    console.log('Minimal puppeteer failed:', error3.message);
                    console.log('Trying system browser detection...');

                    // Method 4: Try to detect and use system browser
                    try {
                        pdfBuffer = await generatePDFWithSystemBrowser(htmlContent, processedProject);
                        console.log('PDF generated successfully with system browser');
                    } catch (error4) {
                        console.error('All PDF generation methods failed:');
                        console.error('1. standard puppeteer:', error1.message);
                        console.error('2. chromium fallback:', error2.message);
                        console.error('3. minimal puppeteer:', error3.message);
                        console.error('4. system browser:', error4.message);

                        // Log additional debugging information
                        console.error('Environment details:');
                        console.error('- VERCEL:', process.env.VERCEL);
                        console.error('- NODE_ENV:', process.env.NODE_ENV);
                        console.error('- Platform:', process.platform);
                        console.error('- Architecture:', process.arch);
                        console.error('- Node version:', process.version);

                        throw new Error(`All PDF generation methods failed. Environment: ${process.env.VERCEL ? 'Vercel' : 'Local'}, Platform: ${process.platform}, Arch: ${process.arch}. Check server logs for detailed error information.`);
                    }
                }
            }
        }

        console.log('PDF generated successfully');
        res.status(200).json({ pdfBuffer });

    } catch (error) {
        console.error('Error during PDF generation:', error);
        res.status(500).json({ message: 'Error during PDF generation', error: error.message });
    }
}

/**
 * Generate PDF using minimal puppeteer configuration for serverless environments
 */
async function generatePDFWithMinimalPuppeteer(htmlContent, processedProject) {
    console.log('Launching minimal puppeteer configuration...');

    // Use the most basic configuration possible for serverless
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor',
            '--disable-extensions',
            '--disable-plugins',
            '--disable-images',
            '--disable-javascript',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-popup-blocking',
            '--disable-client-side-phishing-detection',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-background-networking',
            '--disable-sync',
            '--disable-translate',
            '--hide-scrollbars',
            '--mute-audio',
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-default-apps',
            '--disable-component-update',
            '--disable-domain-reliability',
            '--disable-ipc-flooding-protection',
            '--disable-hang-monitor',
            '--disable-prompt-on-repost',
            '--disable-popup-blocking',
            '--disable-client-side-phishing-detection',
            '--disable-breakpad',
            '--disable-component-extensions-with-background-pages'
        ]
    });

    try {
        console.log('Creating new page...');
        const page = await browser.newPage();

        console.log('Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

        const firstPageSettings = processedProject.pages?.[0]?.pageSettings || { width: 800, height: 600 };
        console.log('Generating PDF with minimal puppeteer...');

        const pdfBuffer = await page.pdf({
            width: `${firstPageSettings.width}px`,
            height: `${firstPageSettings.height}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });

        console.log('PDF generated successfully with minimal puppeteer');
        return pdfBuffer;
    } catch (error) {
        console.error('Error in minimal puppeteer:', error.message);
        throw error;
    } finally {
        console.log('Closing minimal puppeteer browser...');
        await browser.close();
    }
}

/**
 * Generate PDF using standard puppeteer
 */
async function generatePDFWithStandardPuppeteer(htmlContent, processedProject) {
    console.log('Launching standard puppeteer...');

    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
        ]
    });

    try {
        console.log('Creating new page...');
        const page = await browser.newPage();

        console.log('Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

        const firstPageSettings = processedProject.pages?.[0]?.pageSettings || { width: 800, height: 600 };
        console.log('Generating PDF with standard puppeteer...');

        const pdfBuffer = await page.pdf({
            width: `${firstPageSettings.width}px`,
            height: `${firstPageSettings.height}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });

        console.log('PDF generated successfully with standard puppeteer');
        return pdfBuffer;
    } catch (error) {
        console.error('Error in standard puppeteer:', error.message);
        throw error;
    } finally {
        console.log('Closing standard puppeteer browser...');
        await browser.close();
    }
}

/**
 * Generate PDF using chromium fallback
 */
async function generatePDFWithChromiumFallback(htmlContent, processedProject) {
    console.log('Launching chromium fallback...');

    try {
        const { puppeteer: puppeteerInstance, options: browserOptions } = await getBrowserOptions();

        console.log('Chromium options:', JSON.stringify(browserOptions, null, 2));
        const browser = await puppeteerInstance.launch(browserOptions);

        try {
            console.log('Creating new page...');
            const page = await browser.newPage();

            console.log('Setting page content...');
            await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

            const firstPageSettings = processedProject.pages?.[0]?.pageSettings || { width: 800, height: 600 };
            console.log('Generating PDF with chromium fallback...');

            const pdfBuffer = await page.pdf({
                width: `${firstPageSettings.width}px`,
                height: `${firstPageSettings.height}px`,
                printBackground: true,
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                preferCSSPageSize: true
            });

            console.log('PDF generated successfully with chromium fallback');
            return pdfBuffer;
        } finally {
            console.log('Closing chromium browser...');
            await browser.close();
        }
    } catch (error) {
        console.error('Error in chromium fallback:', error.message);
        throw error;
    }
}

/**
 * Generate PDF using system browser detection
 */
async function generatePDFWithSystemBrowser(htmlContent, processedProject) {
    console.log('Trying system browser detection...');

    // Try to find any available browser executable
    const possiblePaths = [
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/usr/bin/firefox',
        '/usr/bin/brave-browser',
        '/usr/bin/microsoft-edge',
        '/usr/bin/edge',
        '/usr/bin/safari',
        '/usr/bin/opera',
        '/usr/bin/vivaldi'
    ];

    let browserPath = null;
    for (const path of possiblePaths) {
        try {
            const fs = require('fs');
            if (fs.existsSync(path)) {
                browserPath = path;
                console.log(`Found browser at: ${browserPath}`);
                break;
            }
        } catch (error) {
            // Continue to next path
        }
    }

    if (!browserPath) {
        throw new Error('No system browser found');
    }

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: browserPath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote'
        ]
    });

    try {
        console.log('Creating new page...');
        const page = await browser.newPage();

        console.log('Setting page content...');
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 60000 });

        const firstPageSettings = processedProject.pages?.[0]?.pageSettings || { width: 800, height: 600 };
        console.log('Generating PDF with system browser...');

        const pdfBuffer = await page.pdf({
            width: `${firstPageSettings.width}px`,
            height: `${firstPageSettings.height}px`,
            printBackground: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            preferCSSPageSize: true
        });

        console.log('PDF generated successfully with system browser');
        return pdfBuffer;
    } catch (error) {
        console.error('Error in system browser:', error.message);
        throw error;
    } finally {
        console.log('Closing system browser...');
        await browser.close();
    }
}

/**
 * Health check function to test PDF generation setup
 */
async function healthCheck(req, res) {
    try {
        console.log('Running PDF generation health check...');

        // Test basic HTML generation
        const testProject = {
            pages: [{
                id: 1,
                pageSettings: { width: 800, height: 600 },
                elements: [{
                    type: 'text',
                    properties: {
                        text: 'Test PDF Generation',
                        fontSize: 24,
                        fontWeight: 'bold',
                        color: '#000000',
                        x: 100,
                        y: 100
                    }
                }]
            }]
        };

        const htmlContent = generateHTMLFromProject(testProject);
        console.log('HTML generation test passed');

        // Test image processing
        const processedProject = await processProjectImages(testProject);
        console.log('Image processing test passed');

        res.status(200).json({
            status: 'healthy',
            message: 'PDF generation setup is working correctly',
            tests: ['HTML generation', 'Image processing'],
            environment: {
                vercel: !!process.env.VERCEL,
                nodeEnv: process.env.NODE_ENV,
                platform: process.platform,
                architecture: process.arch
            }
        });

    } catch (error) {
        console.error('Health check failed:', error);
        res.status(500).json({
            status: 'unhealthy',
            message: 'PDF generation setup has issues',
            error: error.message
        });
    }
}

module.exports = {
    generatePDF,
    processProjectImages,
    generateHTMLFromProject,
    processImageElement,
    downloadImageToBase64,
    healthCheck,
    generatePDFWithStandardPuppeteer,
    generatePDFWithChromiumFallback,
    generatePDFWithMinimalPuppeteer,
    generatePDFWithSystemBrowser
};