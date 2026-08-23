import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '../scripts/import-p1c-r2c-references.mjs';

const source='C:\\Users\\luo_d\\.codex\\attachments\\bc700a7d-0d8b-46ed-8560-991286938890\\pasted-text.txt';
test('R2C parser treats LF and CRLF as identical',()=>{const dir=mkdtempSync(join(process.cwd(),'test','.tmp-r2c-parser-'));try{const text=readFileSync(source,'utf8').replace(/\r\n?/g,'\n');writeFileSync(join(dir,'lf.txt'),text);writeFileSync(join(dir,'crlf.txt'),text.replace(/\n/g,'\r\n'));assert.equal(parse(join(dir,'lf.txt')).length,9);assert.deepEqual(parse(join(dir,'lf.txt')),parse(join(dir,'crlf.txt')))}finally{rmSync(dir,{recursive:true,force:true})}});
test('R2C parser rejects incomplete input before writes',()=>{const dir=mkdtempSync(join(process.cwd(),'test','.tmp-r2c-parser-bad-'));try{writeFileSync(join(dir,'bad.txt'),'R2C-01\nImages:\n');assert.notEqual(parse(join(dir,'bad.txt')).length,9)}finally{rmSync(dir,{recursive:true,force:true})}});
