const fs = require('fs');
const path = require('path');

const imgDir = path.join(__dirname, 'app/assets/img');
const files = fs.readdirSync(imgDir).filter(f => !f.startsWith('.'));

const brideMatch = files.find(f => f.toLowerCase().includes('bride'));
const groomMatch = files.find(f => f.toLowerCase().includes('groom'));

let others = files.filter(f => f !== brideMatch && f !== groomMatch).sort();

const assignments = {};
if (brideMatch) assignments[brideMatch] = 'bride' + path.extname(brideMatch);
if (groomMatch) assignments[groomMatch] = 'groom' + path.extname(groomMatch);

const contexts = [
  'bg-main',
  'bg-savethedate',
  'bg-reception',
  'bg-dresscode',
  'bg-gift',
  'bg-rsvp',
  'bg-wishes',
  'bg-timeline',
  'slideshow-1',
  'slideshow-2',
  'slideshow-3',
  'slideshow-4',
  'slideshow-5'
];

for(let ctx of contexts) {
  if (others.length > 0) {
    const file = others.shift();
    assignments[file] = ctx + path.extname(file);
  }
}

let galleryIdx = 1;
while(others.length > 0) {
  const file = others.shift();
  assignments[file] = `gallery-${galleryIdx}` + path.extname(file);
  galleryIdx++;
}

for(let oldName in assignments) {
  fs.renameSync(path.join(imgDir, oldName), path.join(imgDir, assignments[oldName]));
}

fs.writeFileSync('assignments.json', JSON.stringify(assignments, null, 2));
console.log('Renamed successfully, see assignments.json');

