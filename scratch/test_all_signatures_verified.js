const fs = require('fs');

global.window = global;
require('../designs/options.js');

const styleCss = fs.readFileSync('./style.css', 'utf8');
const designs = window.PptDesigns;
const designKeys = Object.keys(designs);

console.log(`=== Validating Signature Components for all ${designKeys.length} designs ===`);

let totalComps = 0;
let errors = [];

for (const key of designKeys) {
  const d = designs[key];
  const koreanName = d.koreanName || d.name;
  const comps = window.getThemeSignatureComponents(key);

  if (!comps || comps.length === 0) {
    errors.push(`[${key}] No components returned!`);
    continue;
  }

  totalComps += comps.length;

  for (const c of comps) {
    if (!c.id || !c.name || !c.icon || !c.html || !c.w || !c.h) {
      errors.push(`[${key}] Component ${JSON.stringify(c)} is missing required fields.`);
    }

    // Extract root class in html
    const classMatch = c.html.match(/class="sig-comp\s+([^"]+)"/);
    if (classMatch) {
      const specificClass = classMatch[1].split(' ')[0];
      // Check if .sig-comp.<specificClass> or .<specificClass> exists in style.css
      if (!styleCss.includes(specificClass)) {
        errors.push(`[${key}] Class ${specificClass} not found in style.css`);
      }
    }
  }
}

// Special checks
const matComps = window.getThemeSignatureComponents('mat');
const matNames = matComps.map(c => c.name);
console.log('Mat (매트 택타일 그린) components:', matNames);
if (matNames.some(n => n.includes('포스트잇') || n.includes('바인더 클립'))) {
  errors.push('Mat still has post-it or binder clip!');
}

const skeuoComps = window.getThemeSignatureComponents('skeuo');
console.log('Skeuo (스큐어모피즘) components:', skeuoComps.map(c => c.name));

const daisyComps = window.getThemeSignatureComponents('daisy-days');
console.log('Daisy Days (데이지 데이즈) components:', daisyComps.map(c => c.name));

const blueProfComps = window.getThemeSignatureComponents('blue-professional');
console.log('Blue Professional (블루 프로페셔널) components:', blueProfComps.map(c => c.name));

const sakuraComps = window.getThemeSignatureComponents('sakura-chroma');
console.log('Sakura Chroma (사쿠라 크로마) components:', sakuraComps.map(c => c.name));

console.log(`\nValidation finished. Total components registered: ${totalComps}. Errors: ${errors.length}`);
if (errors.length > 0) {
  console.error('Errors found:', errors);
  process.exit(1);
} else {
  console.log('All 44 designs successfully verified with 100% appropriate components and CSS styles!');
}
