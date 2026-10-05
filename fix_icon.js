const Jimp = require('jimp');

async function fixIcon() {
    try {
        const image = await Jimp.read('./app/assets/img/logo/serastory_amplop_logo.png');
        
        // Get dimensions
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        
        // Find the maximum dimension to make it a perfect square
        const size = Math.max(width, height);
        
        // Contain it within a square of size x size, filling empty space with transparent pixels
        // (Jimp's default contain behavior is transparent for PNGs)
        await image.contain(size, size).writeAsync('./app/icon.png');
        
        console.log("Icon successfully made square and saved to app/icon.png");
    } catch (e) {
        console.error("Error fixing icon:", e);
    }
}

fixIcon();
