// Verification script for signature object support
const fs = require('fs');
const path = require('path');

const optionsCode = fs.readFileSync(path.join(__dirname, '..', 'designs', 'options.js'), 'utf8');
const appCode = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');

// 1. Check window.PptThemeComponents in options.js
const sandbox = { window: {}, document: {}, console: console };
const vm = require('vm');
vm.createContext(sandbox);
vm.runInContext(optionsCode, sandbox);

console.log('Archetypes defined in options.js:');
const archetypes = Object.keys(sandbox.window.PptThemeComponents);
console.log(archetypes);

let totalComps = 0;
let iconDuplicates = 0;
for (const key of archetypes) {
  const comps = sandbox.window.PptThemeComponents[key];
  if (Array.isArray(comps)) {
    totalComps += comps.length;
    for (const c of comps) {
      if (c.name.includes(c.icon)) {
        console.warn(`Duplicate icon found in [${key}] ${c.id}: "${c.name}" vs icon "${c.icon}"`);
        iconDuplicates++;
      }
    }
  }
}
console.log(`Total archetypes: ${archetypes.length}, total components: ${totalComps}, icon duplicates: ${iconDuplicates}`);

// 2. Check app.js signatures
const hasApplySigStyles = appCode.includes('function applySignatureCustomStyles');
const hasBeginSigTextEdit = appCode.includes('function beginSignatureTextEdit');
const hasCommitSigSync = appCode.includes('object.isSignature || object.signatureId') && appCode.includes('object.htmlContent = htmlWrapper.innerHTML');
const hasShowTextToolbarSig = appCode.includes('(object.isSignature || object.signatureId) && textElement');
const hasPointerdownSigDrag = appCode.includes('beginSignatureTextEdit(event, object, element)') && appCode.includes('beginDrag(event, object)');

console.log('Check app.js features:');
console.log('applySignatureCustomStyles:', hasApplySigStyles);
console.log('beginSignatureTextEdit:', hasBeginSigTextEdit);
console.log('commitActiveTextEditing sync:', hasCommitSigSync);
console.log('showTextToolbar support:', hasShowTextToolbarSig);
console.log('pointerdown drag & edit support:', hasPointerdownSigDrag);

if (iconDuplicates === 0 && hasApplySigStyles && hasBeginSigTextEdit && hasCommitSigSync && hasShowTextToolbarSig && hasPointerdownSigDrag) {
  console.log('✅ ALL VERIFICATIONS PASSED SUCCESSFULLY!');
} else {
  console.error('❌ Verification failed');
  process.exit(1);
}
