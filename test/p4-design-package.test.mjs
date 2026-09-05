import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateDesignPackage, structureFingerprint, designToStateInput } from '../workbench/design-package.mjs';
const read=name=>JSON.parse(fs.readFileSync(new URL('./fixtures/'+name,import.meta.url)));
const valid=()=>read('nature-launch-valid.json');

test('six by three fixture validates and broken bead order fails without mutating author text', () => {
  const pkg=valid(), before=JSON.stringify(pkg);
  const result=validateDesignPackage(pkg);
  assert.equal(result.ok,true);
  assert.equal(result.designs.length,18);
  assert.equal(JSON.stringify(pkg),before);
  assert.equal(result.designs[0].workbench_validation.status,'NOT_RUN');
  assert.equal(result.designs[0].beads[0].source_status,'PROPOSED');
  assert.equal(validateDesignPackage(read('nature-launch-invalid.json')).ok,false);
  assert.ok(validateDesignPackage(read('nature-launch-invalid.json')).errors.some(x=>x.includes('position')));
});

test('version, six-theme coverage, identity, dimensions, quantity and status are validated strictly', () => {
  const edits=[
    p=>p.version='other', p=>p.themes.pop(), p=>p.designs.pop(),
    p=>p.designs[1].design_id=p.designs[0].design_id,
    p=>p.designs[0].beads[0].material_id='', p=>p.designs[0].beads[0].spec_id='',
    p=>p.designs[0].beads[0].size_mm=0, p=>p.designs[0].beads[0].size_mm='8',
    p=>p.designs[0].beads[0].source_status='approved',
    p=>p.designs[0].beads[0].quantity=0, p=>p.designs[0].target_wrist_cm=-1
  ];
  for(const edit of edits) { const p=valid(); edit(p); assert.equal(validateDesignPackage(p).ok,false); }
  for(const p of [null,[],{}, {designs:[null]}, {version:'CRYSTAL-NATURE-LAUNCH-V1',themes:[],designs:[{}]}]) {
    assert.equal(validateDesignPackage(p).ok,false);
  }
});

test('PROPOSED instances require matching full proposals and composite quantity needs explanation', () => {
  const p=valid();
  p.designs[0].material_change_proposals=[];
  assert.equal(validateDesignPackage(p).ok,false);
  const q=valid(); q.designs[0].material_change_proposals[0].requested_spec='different';
  assert.equal(validateDesignPackage(q).ok,false);
  const r=valid(); r.designs[0].beads[0].quantity=2;
  assert.ok(validateDesignPackage(r).errors.some(x=>x.includes('quantity')));
});

test('recomputed expected BOM mismatch is an error and existing validation cannot certify it', () => {
  const p=valid(); p.designs[0].expected_bom[0].quantity=200;
  p.designs[0].workbench_validation.status='PASS';
  const result=validateDesignPackage(p);
  assert.equal(result.ok,false);
  assert.equal(result.designs[0].validation.bom_match,false);
  assert.equal(result.designs[0].validation.status,'FAIL');
});

test('identity presence does not certify formal mapping or promote authored material statuses', () => {
  const p=valid();
  const noMapping=validateDesignPackage(p);
  assert.equal(noMapping.designs[0].validation.material_mapping.not_checked,2);
  const unmatched=validateDesignPackage(p,{approvedMappings:[]});
  assert.equal(unmatched.designs[0].validation.material_mapping.unmapped,2);
  const matched=validateDesignPackage(p,{approvedMappings:[{material_id:'test-stone',spec_id:'test-stone-8'}]});
  assert.equal(matched.designs[0].validation.material_mapping.mapped,2);
  assert.equal(matched.designs[0].beads[0].source_status,'PROPOSED');
  assert.equal(matched.designs[0].validation.material_mapping.proposed,2);
});

test('structural duplicate detection ignores color and names and fingerprint is order stable', () => {
  const p=valid(), a=p.designs[0], b=structuredClone(a);
  b.zh_name='改名'; b.color_language=['different'];
  b.structure_signature=Object.fromEntries(Object.entries(b.structure_signature).reverse());
  assert.equal(structureFingerprint(a),structureFingerprint(b));
  p.designs[1].structure_signature=structuredClone(a.structure_signature);
  assert.equal(validateDesignPackage(p).designs[1].validation.duplicate_structure_warning,true);
});

test('load creates detached state preserving order, names, status, identity and notes', () => {
  const design=valid().designs[0];
  const state=designToStateInput(design);
  assert.equal(state.wristCm,16);
  assert.equal(state.layoutMode,'bracelet');
  assert.equal(state.instances[0].specId,'test-stone-8');
  assert.equal(state.instances[0].sourceStatus,'PROPOSED');
  assert.equal(state.instances[0].materialName,'测试珠');
  assert.equal(state.instances[1].slotIndex,1);
  assert.notEqual(state.instances[0].instanceId,state.instances[1].instanceId);
  state.design.sample_notes.push('edited');
  assert.equal(design.sample_notes.length,1);
});

test('companion proposal IDs resolve only against supplied complete design/spec-scoped evidence', () => {
  const p=valid(), design=p.designs[0];
  design.material_change_proposals=['MCP-TEST'];
  const proposal={proposal_id:'MCP-TEST',requested_material:'Test bead',requested_spec:'test-stone-8',
    design_ids:[design.design_id],themes:[design.theme],why_needed:['Synthetic test only'],
    acceptable_substitute:'None',impact_if_rejected:'None',evidence_or_design_reason:'Test'};
  assert.equal(validateDesignPackage(p).ok,false);
  assert.equal(validateDesignPackage(p,{materialChangeProposals:[proposal]}).ok,true);
  for(const patch of [{requested_spec:'wrong'},{design_ids:['wrong']},{why_needed:[]},{requested_material:'wrong'}]) {
    assert.equal(validateDesignPackage(p,{materialChangeProposals:[{...proposal,...patch}]}).ok,false);
  }
});

test('malformed proposal scopes are validation failures rather than exceptions or substring matches', () => {
  for(const scope of [42,{},'prefix-TEST-MOUNTAIN-1-suffix']) {
    const p=valid(), d=p.designs[0], proposal=d.material_change_proposals[0];
    delete proposal.design_id;
    proposal.design_ids=scope;
    assert.equal(validateDesignPackage(p).ok,false);
  }
});
