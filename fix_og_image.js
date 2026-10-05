const Jimp = require('jimp');

async function fixOgImage() {
    try {
        const image = await Jimp.read('./app/assets/img/ALBUM-6.jpeg');
        
        // 1.91:1 aspect ratio is standard for large Open Graph cards (e.g. 1200x630)
        // We will cover the image into a 1200x630 box
        await image.cover(1200, 630).writeAsync('./app/opengraph-image.jpg');
        await image.cover(1200, 630).writeAsync('./app/twitter-image.jpg');
        
        console.log("OG Image successfully resized to 1200x630 and saved.");
    } catch (e) {
        console.error("Error fixing OG Image:", e);
    }
}

fixOgImage();
