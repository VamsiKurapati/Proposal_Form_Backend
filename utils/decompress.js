const pako = require('pako');

const decompress = (compressedBase64) => {
    try {
        // Convert from base64
        const compressed = Uint8Array.from(atob(compressedBase64), c => c.charCodeAt(0));

        // Decompress
        const decompressed = pako.ungzip(compressed, { to: 'string' });

        // Parse JSON
        return JSON.parse(decompressed);
    } catch (error) {
        console.error('Decompression failed:', error);
        throw new Error('Failed to decompress data');
    }
};

module.exports = {
    decompress
};