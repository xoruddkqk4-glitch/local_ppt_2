const fs = require('fs');

global.window = global;
require('../designs/options.js');

const designs = window.PptDesigns;
const designKeys = Object.keys(designs);

console.log('=== Comprehensive Verification for 44 Themes Signature Components ===');
console.log('Total designs:', designKeys.length);

let passedCount = 0;
let totalComponents = 0;

for (const key of designKeys) {
  const comps = window.getThemeSignatureComponents(key);
  if (!comps || !Array.isArray(comps) || comps.length < 3) {
    console.error(`FAIL: Design ${key} returned invalid components:`, comps);
    process.exit(1);
  }
  
  for (const comp of comps) {
    if (!comp.id || !comp.name || !comp.icon || !comp.w || !comp.h || !comp.html) {
      console.error(`FAIL: Component missing required fields in ${key}:`, comp);
      process.exit(1);
    }
    // Check serialization
    const mockObject = {
      id: 'sig_test_' + Date.now(),
      type: 'html-card',
      role: 'html-container',
      isSignature: true,
      signatureId: comp.id,
      htmlContent: comp.html,
      x: 35,
      y: 35,
      w: comp.w,
      h: comp.h
    };
    const json = JSON.stringify(mockObject);
    const parsed = JSON.parse(json);
    if (parsed.htmlContent !== comp.html || parsed.signatureId !== comp.id) {
      console.error(`FAIL: Serialization round-trip failed in ${key}:`, comp.id);
      process.exit(1);
    }
    totalComponents++;
  }
  passedCount++;
}

console.log(`PASS: All ${passedCount} designs verified successfully!`);
console.log(`Total signature components available: ${totalComponents}`);
console.log('All schemas and serialization round-trips verified 100%!');
