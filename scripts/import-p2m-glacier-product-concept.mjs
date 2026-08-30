import { DatabaseSync } from 'node:sqlite';

const name = 'Glacier Signature Prototype 01';
const intent = 'Glacier Signature / high-end validation prototype research concept. No supplier selection, purchase, production commitment, final packaging selection, final retail price, or gemstone verification is implied.';
const notes = 'P2M user decision provenance: explicit_user_choice_A_in_chatgpt on 2026-08-30. GPT brief: inputs/p2m-gpt-glacier-signature-prototype-brief-20260830.json. Exact staged public-catalog benchmarks may support conservative planning only; they remain unapproved and unverified.';

export function importP2mProductConcept(dbPath) {
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys=ON');
  try {
    const existing = db.prepare('select id from product_concept where name=?').get(name);
    if (existing) return { id: existing.id, created: 0, reused: 1, bom_created: 0 };
    db.exec('BEGIN IMMEDIATE');
    const id = Number(db.prepare('insert into product_concept(name,theme,version_label,status,intent,notes) values (?,?,?,?,?,?)').run(name, 'Glacier', 'v0', 'research', intent, notes).lastInsertRowid);
    db.exec('COMMIT');
    return { id, created: 1, reused: 0, bom_created: 0 };
  } catch (error) {
    try { db.exec('ROLLBACK'); } catch {}
    throw error;
  } finally { db.close(); }
}

if (process.argv[1]?.endsWith('import-p2m-glacier-product-concept.mjs')) console.log(JSON.stringify(importP2mProductConcept(process.argv[2] ?? 'data/crystal-design.sqlite'), null, 2));
