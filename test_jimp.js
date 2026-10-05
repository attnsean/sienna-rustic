const Jimp = require('jimp');
async function test() {
    const qrImage = await Jimp.read('https://quickchart.io/qr?text=test&size=350&margin=2');
    
    // Create new image with white background
    new Jimp(350, 400, '#FFFFFF', async (err, image) => {
        if (err) throw err;
        
        // Composite QR onto new canvas
        image.composite(qrImage, 0, 0);
        
        const fontSmall = await Jimp.loadFont(Jimp.FONT_SANS_8_BLACK);
        const fontBold = await Jimp.loadFont(Jimp.FONT_SANS_10_BLACK);
        
        const text1 = "DEVELOPED BY";
        const text2 = "- SERA STORY -";
        
        const w1 = Jimp.measureText(fontSmall, text1);
        const w2 = Jimp.measureText(fontBold, text2);
        
        image.print(fontSmall, 350 - w1 - 15, 360, text1);
        image.print(fontBold, 350 - w2 - 10, 372, text2);
        
        await image.writeAsync('test_out2.png');
        console.log('done');
    });
}
test().catch(console.error);
