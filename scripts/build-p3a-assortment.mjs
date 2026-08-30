import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const sections = [['minerals_crystals','mineral_selection'],['pearls_organic','pearls_and_organic'],['hardware_accessories','hardware_selection'],['packaging','packaging_selection']];
export function buildAssortment(sourcePath, dbPath) {
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8')); const db = new DatabaseSync(dbPath, { readOnly: true });
  const items=[];
  for (const [section,key] of sections) for (const raw of source[key] ?? []) {
    const material = section === 'minerals_crystals' || section === 'pearls_organic' ? db.prepare('select id,canonical_name from material where canonical_name=?').get(raw.name) : null;
    const component = section === 'hardware_accessories' ? db.prepare('select id,component_code from component where notes like ? limit 1').get(`%${raw.name}%`) : null;
    const packaging = section === 'packaging' ? db.prepare('select id,packaging_code from packaging_option where notes like ? limit 1').get(`%${raw.name}%`) : null;
    items.push({section,name:raw.name,priority:raw.priority,themes:raw.themes??[],roles:raw.roles??[],preferred_forms:raw.recommended_forms??[raw.spec??raw.use??''],selection_notes:raw.selection_note??raw.spec??'',canonical_identity:material??component??packaging??null,identity_status:(material||component||packaging)?'canonical_match':'candidate_only'});
  }
  const count=s=>items.filter(i=>i.section===s).length; const canonical=items.filter(i=>i.identity_status==='canonical_match');
  const result={version:source.version,items,reconciliation:{selected_mineral_count:count('minerals_crystals'),selected_pearl_organic_count:count('pearls_organic'),selected_hardware_count:count('hardware_accessories'),selected_packaging_count:count('packaging'),canonical_match_count:canonical.length,candidate_only_count:items.length-canonical.length,known_canonical_identities:canonical.map(i=>({name:i.name,section:i.section,identity:i.canonical_identity})),supplier_recommendation:'none'}};
  db.close(); return result;
}
if(process.argv[1]?.endsWith('build-p3a-assortment.mjs')){const r=buildAssortment('data/assortment-selection-v1.json','data/crystal-design.sqlite');fs.writeFileSync('outputs/assortment-selection-v1.json',JSON.stringify(r,null,2)+'\n');fs.writeFileSync('outputs/assortment-selection-v1.csv','section,name,priority,themes,roles,preferred_forms,identity_status\n'+r.items.map(i=>[i.section,i.name,i.priority,i.themes.join('|'),i.roles.join('|'),i.preferred_forms.join('|'),i.identity_status].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\n')+'\n');fs.writeFileSync('outputs/p3a-assortment-reconciliation.json',JSON.stringify(r.reconciliation,null,2)+'\n');console.log(JSON.stringify(r.reconciliation,null,2));}
