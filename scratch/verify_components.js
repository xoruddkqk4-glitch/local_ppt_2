const fs = require('fs');

global.window = global;
require('../designs/options.js');

console.log('Loaded PptDesigns count:', Object.keys(window.PptDesigns).length);
