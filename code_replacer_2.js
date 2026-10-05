const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    const fullPath = path.join(__dirname, filePath);
    if (!fs.existsSync(fullPath)) return;
    let content = fs.readFileSync(fullPath, 'utf8');
    for (const [oldStr, newStr] of replacements) {
        content = content.replace(oldStr, newStr);
    }
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Updated ${filePath}`);
}

replaceInFile('app/components/PhotoGallery.tsx', [
    ['../assets/img/ALBUM-1.jpeg', '../assets/img/gallery-1.jpg'],
    ['../assets/img/ALBUM-2.jpeg', '../assets/img/gallery-2.jpg'],
    ['../assets/img/ALBUM-3.jpeg', '../assets/img/gallery-3.jpg'],
    ['../assets/img/ALBUM-4.jpeg', '../assets/img/gallery-4.jpg'],
    ['../assets/img/ALBUM-5.jpeg', '../assets/img/gallery-5.jpg'],
    ['../assets/img/ALBUM-6.jpeg', '../assets/img/gallery-6.jpg'],
    ['../assets/img/ALBUM-7.jpeg', '../assets/img/gallery-7.jpg'],
    ['../assets/img/ALBUM-8.jpeg', '../assets/img/gallery-8.jpg'],
    ['../assets/img/ALBUM-9.jpeg', '../assets/img/gallery-9.jpg'],
    ['../assets/img/ALBUM-10.jpeg', '../assets/img/gallery-10.jpg'],
    ['../assets/img/ALBUM-11.jpeg', '../assets/img/gallery-11.jpg'],
    ['../assets/img/ALBUM-12.jpeg', '../assets/img/gallery-12.jpg'],
    ['../assets/img/ALBUM-13.jpeg', '../assets/img/gallery-13.jpg'],
    ['../assets/img/ALBUM-14.jpeg', '../assets/img/gallery-14.jpg']
]);

