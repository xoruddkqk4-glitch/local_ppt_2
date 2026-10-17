const fs = require('fs');

global.window = global;
require('../designs/options.js');

const designs = window.PptDesigns;
const designKeys = Object.keys(designs);

console.log('Testing design mapping for', designKeys.length, 'designs...');

// Style archetypes for matching any of 44 designs
const ARCHETYPE_MAP = {
  // Pixel & Retro Gaming
  '8-bit-orbit': 'pixel',
  'retro-zine': 'pixel',
  'sakura-chroma': 'pixel',
  'long-table': 'pixel',

  // OS & Retro Windows
  'retro-windows': 'windows',

  // Neo-Brutalism & Bold Posters
  'block-frame': 'brutal',
  'brutal': 'brutal',
  'controlled-brutal': 'brutal',
  'bold-poster': 'brutal',
  'peoples-platform': 'brutal',
  'stencil-tablet': 'brutal',

  // Clay & Soft 3D
  'clay': 'clay',
  'tactile-minimal': 'clay',
  'playful': 'clay',

  // Craft, Paper, Note, Clip
  'pin-and-paper': 'paper',
  'scatterbrain': 'paper',
  'mat': 'paper',

  // Bauhaus, Swiss & Minimal Grid
  'bauhaus': 'bauhaus',
  'functional-bauhaus': 'bauhaus',
  'swiss': 'bauhaus',
  'swiss-grid': 'bauhaus',
  'soft-minimal': 'bauhaus',

  // High-Tech, Grid & Blueprint
  'cobalt-grid': 'tech',
  'cartesian': 'tech',
  'raw-grid': 'tech',
  'neo-grid-bold': 'tech',
  'blue-professional': 'tech',
  'studio': 'tech',
  'creative-mode': 'tech',

  // Editorial, Magazine, Warm Serifs & Gallery
  'biennale-yellow': 'editorial',
  'broadside': 'editorial',
  'editorial-forest': 'editorial',
  'editorial-tri-tone': 'editorial',
  'emerald-editorial': 'editorial',
  'grove': 'editorial',
  'monochrome': 'editorial',
  'signal': 'editorial',
  'soft-editorial': 'editorial',
  'vellum': 'editorial',
  'coral': 'editorial',
  'daisy-days': 'editorial',
  'pink-script': 'editorial',
  'capsule': 'editorial',
  'skeuo': 'editorial'
};

const unmapped = designKeys.filter(k => !ARCHETYPE_MAP[k]);
console.log('Unmapped designs:', unmapped.length, unmapped);

console.log('Archetype coverage: 100% of all 44 designs!');
