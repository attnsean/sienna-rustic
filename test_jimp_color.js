const Jimp = require('jimp');

async function test() {
    const qrImage = await Jimp.read('https://quickchart.io/qr?text=test&size=350&margin=2');
    
    // Create new image with black background at bottom
    new Jimp(350, 420, '#0a0a0a', async (err, image) => {
        if (err) throw err;
        
        // Composite QR onto new canvas
        image.composite(qrImage, 0, 0);
        
        const fontTitle = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
        const fontSubtitle = await Jimp.loadFont(Jimp.FONT_SANS_8_WHITE);
        
        const text1 = "SERA STORY";
        const text2 = "© 2026 ALL RIGHTS RESERVED.";
        
        const w1 = Jimp.measureText(fontTitle, text1);
        const w2 = Jimp.measureText(fontSubtitle, text2);
        
        // Create a temporary transparent image for the gold title
        const titleImg = new Jimp(w1, 20, 0x00000000);
        titleImg.print(fontTitle, 0, 0, text1);
        
        // Colorize white text to gold #d4af37. In Jimp, white is 0xFFFFFFFF.
        // We can just use scan and replace all white pixels with gold.
        titleImg.scan(0, 0, titleImg.bitmap.width, titleImg.bitmap.height, function(x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            if (alpha > 0) {
                this.bitmap.data[idx + 0] = 212; // R
                this.bitmap.data[idx + 1] = 175; // G
                this.bitmap.data[idx + 2] = 55;  // B
            }
        });
        
        // Create a temporary transparent image for the gray subtitle
        const subImg = new Jimp(w2, 12, 0x00000000);
        subImg.print(fontSubtitle, 0, 0, text2);
        subImg.scan(0, 0, subImg.bitmap.width, subImg.bitmap.height, function(x, y, idx) {
            const alpha = this.bitmap.data[idx + 3];
            if (alpha > 0) {
                this.bitmap.data[idx + 0] = 136; // R
                this.bitmap.data[idx + 1] = 136; // G
                this.bitmap.data[idx + 2] = 136; // B
            }
        });
        
        // Composite the colored text onto the main image
        image.composite(titleImg, (350 - w1) / 2, 365);
        image.composite(subImg, (350 - w2) / 2, 395);
        
        await image.writeAsync('test_out_black.png');
        console.log('done black');
    });
}
test().catch(console.error);
