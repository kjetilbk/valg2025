#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from 'fs';

const csvFile = './polls.csv';

console.log('🧹 Cleaning encoding issues in polls.csv...');

// Read the file
const content = readFileSync(csvFile, 'utf8');

// Fix encoding issues
const cleanedContent = content
    .replace(/M�ling/g, 'Måling')
    .replace(/H�yre/g, 'Høyre')
    .replace(/R�dt/g, 'Rødt');

// Write back to the same file (destructive)
writeFileSync(csvFile, cleanedContent, 'utf8');

console.log('✅ Fixed encoding issues:');
console.log('   - M�ling → Måling');
console.log('   - H�yre → Høyre'); 
console.log('   - R�dt → Rødt');
console.log('📁 File overwritten successfully!');