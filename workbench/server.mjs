import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import {createHash,randomUUID} from 'node:crypto';
import {exportDesign} from './studio-view.mjs';
import {validateDesignPackage} from './design-package.mjs';
import {loadLocalAssetManifest,resolveLocalAssetPath} from './local-asset-manifest.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(root, '..');
const stateDir = path.resolve(process.env.WORKBENCH_STATE_DIR || path.join(root, 'state'));
const exportDir = path.resolve(process.env.WORKBENCH_EXPORT_DIR || path.join(root, 'exports'));
const dbPath = path.join(repo, 'data', 'crystal-design.sqlite');
const launchPath = process.env.WORKBENCH_NATURE_LAUNCH_PATH || path.join(repo,'outputs/designs/nature-launch-v1.json');
const proposalPath = path.join(repo,'outputs/handoffs/design/material_change_proposal-nature-launch-v1.json');
const fabricModulePath = path.resolve(repo, 'node_modules/fabric/dist/index.min.mjs');
fs.mkdirSync(stateDir, { recursive: true });
fs.mkdirSync(exportDir, { recursive: true });
const assortment = JSON.parse(fs.readFileSync(path.join(repo, 'outputs', 'assortment-selection-v1.json'), 'utf8'));
const themes = ['Mountain', 'Ocean', 'Forest', 'Sunrise', 'Starlight', 'Glacier'];
const safeName = (value) => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
const json = (res, value, status = 200) => { res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(value)); };
const studioDownloads = new Map(); // Bounded session-only buffers; never overwrites user exports.
const readBody = (req) => new Promise((resolve, reject) => { let body = ''; req.on('data', (chunk) => { body += chunk; }); req.on('end', () => resolve(body)); req.on('error', reject); });
const fileFor = (name) => {
  const decoded=decodeURIComponent(name);
  // Existing ASCII drafts remain compatible; Unicode names get distinct keys, never an empty filename.
  const key=/^[a-zA-Z0-9_-]{1,80}$/.test(decoded)?decoded:`draft-${createHash('sha256').update(decoded).digest('hex').slice(0,24)}`;
  const legacy=path.join(stateDir,`${safeName(name)}.json`);
  if(fs.existsSync(legacy)){try{if(JSON.parse(fs.readFileSync(legacy,'utf8')).name===decoded)return legacy;}catch{}}
  return path.join(stateDir,`${key}.json`);
};
const listDraftNames = () => fs.readdirSync(stateDir)
  .filter((entry) => entry.endsWith('.json') && entry!=='local-asset-manifest.json')
  .map((entry) => {
    try {
      const saved = JSON.parse(fs.readFileSync(path.join(stateDir, entry), 'utf8'));
      return typeof saved.name === 'string' && saved.name.trim() ? saved.name.trim() : entry.slice(0, -5);
    } catch {
      return entry.slice(0, -5);
    }
  });

function dbData() {
  const db = new DatabaseSync(dbPath, { readOnly: true });
  const all = (sql, params = []) => db.prepare(sql).all(...params);
  const one = (sql, params = []) => db.prepare(sql).get(...params);
  const counts = Object.fromEntries([['materials', 'material'], ['variants', 'material_variant'], ['components', 'component'], ['packaging', 'packaging_option'], ['references', 'design_reference'], ['assets', 'image_asset']].map(([key, table]) => [key, Number(one(`SELECT COUNT(*) n FROM ${table}`).n)]));
  const rows = all('SELECT m.id,m.canonical_name,m.material_family,m.natural_status,m.description,v.id variant_id,v.variant_code,v.grade_label,v.color_description,v.transparency,v.optical_features,v.inclusion_features,v.size_range_mm,v.verification_status FROM material m LEFT JOIN material_variant v ON v.material_id=m.id ORDER BY m.canonical_name');
  const materialMap = new Map();
  for (const row of rows) { let item = materialMap.get(row.id); if (!item) { item = { id: row.id, canonical_name: row.canonical_name, material_family: row.material_family, natural_status: row.natural_status, description: row.description, variants: [] }; materialMap.set(row.id, item); } if (row.variant_id) item.variants.push({ id: row.variant_id, variant_code: row.variant_code, grade_label: row.grade_label, color_description: row.color_description, transparency: row.transparency, optical_features: row.optical_features, inclusion_features: row.inclusion_features, size_range_mm: row.size_range_mm, verification_status: row.verification_status }); }
  const materials = [...materialMap.values()].map((m) => ({ ...m, assortment: assortment.items.filter((x) => x.canonical_identity?.id === m.id) }));
  const components = all('SELECT id,component_code,component_type,notes,design_role,hardware_finish,size_mm FROM component').map((x) => ({ ...x, origin: 'canonical' }));
  const packaging = all('SELECT id,packaging_code,packaging_type,material_description,dimensions,finish,suitable_tier,verification_status,notes FROM packaging_option').map((x) => ({ ...x, origin: 'canonical' }));
  const references = all('SELECT id,reference_key,reference_type,local_image_path,source_url,notes,evidence_status FROM design_reference ORDER BY reference_key').map((r) => { const assets = all('SELECT a.id,a.original_filename,a.external_locator,a.asset_status FROM design_reference_image ri JOIN image_asset a ON a.id=ri.image_asset_id WHERE ri.design_reference_id=? ORDER BY ri.display_order', [r.id]); const refThemes = all('SELECT theme FROM design_reference_theme WHERE design_reference_id=?', [r.id]); const snippets = [...all('SELECT asserted_value value,assertion_class FROM design_reference_synthesis_assertion WHERE design_reference_id=? LIMIT 2', [r.id]), ...all('SELECT observed_value value,observation_type assertion_class FROM design_reference_observation WHERE design_reference_id=? LIMIT 2', [r.id])]; return { ...r, themes: refThemes.map((x) => x.theme), assets, asset_count: assets.length, snippets }; });
  db.close();
  const bySection = Object.fromEntries([...new Set(assortment.items.map((x) => x.section))].map((s) => [s, assortment.items.filter((x) => x.section === s).length]));
  const byPriority = Object.fromEntries([...new Set(assortment.items.map((x) => x.priority))].map((p) => [p, assortment.items.filter((x) => x.priority === p).length]));
  return { assortment, overview: { themes, assortmentBySection: bySection, assortmentByPriority: byPriority, canonicalCounts: counts }, db: { counts }, libraries: { materials, accessories: [...components, ...assortment.items.filter((x) => ['hardware_accessories', 'pearls_organic'].includes(x.section)).map((x) => ({ ...x, origin: 'assortment_candidate' }))], packaging: [...packaging, ...assortment.items.filter((x) => x.section === 'packaging').map((x) => ({ ...x, origin: 'assortment_candidate' }))] }, materials, components, packaging, references };
}
function markdown(draft) { return `# ${draft.name}\n\nTheme: ${draft.theme}\n\n## Items\n${draft.items.map((x, i) => `${i + 1}. ${x.name} — role: ${x.role || ''}; form/spec: ${x.form || ''}`).join('\n')}\n\n## Notes\n${draft.notes || ''}\n`; }
function assortmentCsv() { const headers = ['section', 'name', 'priority', 'themes', 'roles', 'preferred_forms', 'identity_status']; return [headers.join(','), ...assortment.items.map((x) => [x.section, x.name, x.priority, x.themes.join('|'), x.roles.join('|'), x.preferred_forms.join('|'), x.identity_status].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(','))].join('\n'); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if(url.pathname==='/api/studio-export'&&req.method==='POST'){
      const payload=JSON.parse(await readBody(req));
      if(!['design-json','bom-json','bom-csv','md'].includes(payload.format)||!Array.isArray(payload.draft?.braceletState?.instances))return json(res,{error:'Invalid Studio export'},400);
      const output=exportDesign(payload.draft,payload.format),token=randomUUID(),name=`Crystal-${payload.format}.${output.ext}`;
      if(Buffer.byteLength(output.text)>5*1024*1024)return json(res,{error:'Export too large'},413);
      if(studioDownloads.size>=20)studioDownloads.delete(studioDownloads.keys().next().value);
      studioDownloads.set(token,{...output,name});return json(res,{downloadUrl:`/api/studio-export/${token}`,filename:name,bytes:Buffer.byteLength(output.text)});
    }
    if(url.pathname.startsWith('/api/studio-export/')&&req.method==='GET'){
      const output=studioDownloads.get(url.pathname.slice('/api/studio-export/'.length));
      if(!output)return json(res,{error:'Export expired; generate it again'},404);
      res.writeHead(200,{'content-type':output.mime,'content-disposition':`attachment; filename="${output.name}"`,'cache-control':'no-store'});return res.end(output.text);
    }
    if(url.pathname==='/api/local-assets'){
      const manifest=loadLocalAssetManifest({rootDir:repo});
      return json(res,{assets:manifest.assets.map(a=>({material_id:a.material_id,spec_id:a.spec_id,status:a.status,needs_mask:a.needs_mask,reason:a.reason,representation_class:a.representation_class,publication_status:a.publication_status,file:a.file,imageUrl:a.status==='ready'&&!a.needs_mask&&a.rights_status!=='prohibited'&&resolveLocalAssetPath({rootDir:repo,file:a.file})?`/assets/local/${encodeURIComponent(a.file)}`:undefined}))});
    }
    if(url.pathname.startsWith('/assets/local/')){
      const name=decodeURIComponent(url.pathname.slice('/assets/local/'.length));
      const allowed=loadLocalAssetManifest({rootDir:repo}).assets.some(a=>a.file===name&&a.status==='ready'&&!a.needs_mask&&a.rights_status!=='prohibited');
      const file=allowed&&resolveLocalAssetPath({rootDir:repo,file:name});
      if(!file)return json(res,{error:'not found'},404);
      res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});return res.end(fs.readFileSync(file));
    }
    if(url.pathname==='/api/nature-launch'||url.pathname.startsWith('/api/nature-launch/')){
      if(!fs.existsSync(launchPath))return json(res,{available:false,reason:'DESIGN_PACKAGE_NOT_READY'});
      const pkg=JSON.parse(fs.readFileSync(launchPath,'utf8'));
      const proposals=fs.existsSync(proposalPath)?JSON.parse(fs.readFileSync(proposalPath,'utf8')).proposals:[];
      const validation=validateDesignPackage(pkg,{materialChangeProposals:proposals});
      if(url.pathname.startsWith('/api/nature-launch/')){const id=decodeURIComponent(url.pathname.slice('/api/nature-launch/'.length));const design=validation.designs.find(d=>d.design_id===id);return design?json(res,design):json(res,{error:{code:'DESIGN_NOT_FOUND',message:'没有这个设计'}},404);}
      return json(res,{available:true,package:pkg,validation});
    }
    if (url.pathname === '/vendor/fabric/index.min.mjs') {
      if (!fs.existsSync(fabricModulePath)) return json(res, { error: { code: 'FABRIC_NOT_INSTALLED', message: 'Run npm install before starting the Workbench.' } }, 503);
      res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=31536000, immutable' });
      return res.end(fs.readFileSync(fabricModulePath));
    }
    if (url.pathname === '/api/data') return json(res, dbData());
    if (url.pathname === '/api/drafts' && req.method === 'GET') return json(res, { drafts: listDraftNames() });
    if (url.pathname.startsWith('/api/drafts/')) {
      const parts = url.pathname.split('/').filter(Boolean); const name = parts[2]; const file = fileFor(name);
      if (parts[3] === 'export' && req.method === 'POST') { const payload = JSON.parse(await readBody(req)); const draft = JSON.parse(fs.readFileSync(file, 'utf8')); const ext = payload.format === 'md' ? 'md' : 'json'; const out = path.join(exportDir, `${safeName(name)}.${ext}`); fs.writeFileSync(out, ext === 'md' ? markdown(draft) : JSON.stringify(draft, null, 2)); return json(res, { ok: true, path: out }); }
      if (req.method === 'GET') { try { return json(res, JSON.parse(fs.readFileSync(file, 'utf8'))); } catch (error) { if (error.code === 'ENOENT') return json(res, { error: { code: 'DRAFT_NOT_FOUND', message: `Draft ${name} does not exist` } }, 404); return json(res, { error: { code: 'MALFORMED_DRAFT', message: `Draft ${name} is malformed: ${error.message}` } }, 422); } }
      if (req.method === 'PUT' || req.method === 'POST') { const draft = JSON.parse(await readBody(req)); if (!draft.name || !Array.isArray(draft.items)) return json(res, { error: { code: 'INVALID_DRAFT', message: 'name and items are required' } }, 400); const tmp = `${file}.${process.pid}.tmp`; fs.writeFileSync(tmp, JSON.stringify(draft, null, 2)); fs.renameSync(tmp, file); return json(res, { ok: true, draft }); }
    }
    if (url.pathname === '/api/export/assortment') { const format = url.searchParams.get('format') === 'csv' ? 'csv' : 'json'; const out = path.join(exportDir, `assortment-selection-v1.${format}`); fs.writeFileSync(out, format === 'csv' ? assortmentCsv() : JSON.stringify(assortment, null, 2)); return json(res, { ok: true, path: out }); }
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)); const file = path.resolve(root, rel); const relative=path.relative(root,file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || /^(state|exports|assets[\\/]local)([\\/]|$)/i.test(relative) || !fs.existsSync(file) || !fs.statSync(file).isFile() || path.relative(root,fs.realpathSync(file)).startsWith('..')) return json(res, { error: 'not found' }, 404);
    const type = file.endsWith('.css') ? 'text/css' : (file.endsWith('.js') || file.endsWith('.mjs')) ? 'application/javascript' : file.endsWith('.svg') ? 'image/svg+xml' : file.endsWith('.png') ? 'image/png' : file.endsWith('.json') ? 'application/json' : 'text/html'; res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' }); return res.end(fs.readFileSync(file));
  } catch (error) { return json(res, { error: { code: 'SERVER_ERROR', message: error.message } }, 500); }
});
const port = Number(process.env.WORKBENCH_PORT || 4173);
server.listen(port, '127.0.0.1', () => console.log(`Crystal Workbench http://127.0.0.1:${server.address().port}`));
