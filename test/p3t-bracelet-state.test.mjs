import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyHistoryCommand,
  commitHistoryState,
  createBraceletState,
  createHistory,
  moveInstance,
  placeInstance,
  redoHistory,
  removeInstance,
  serializeBraceletState,
  setWristSize,
  undoHistory,
} from '../workbench/bracelet-state.mjs';

const place = (state, materialName, slotIndex, instanceId, sizeMm = 10) => placeInstance(state, {
  materialName,
  slotIndex,
  instanceId,
  sizeMm,
  assetRef: `asset:${materialName}`,
  provenanceClass: 'user_owned',
});

test('places two identical materials as independent non-adjacent instances', () => {
  let state = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  state = place(state, 'Tahitian Pearl', 2, 'pearl-a');
  state = place(state, 'Tahitian Pearl', 14, 'pearl-b');
  assert.equal(state.instances.length, 2);
  assert.notEqual(state.instances[0].instanceId, state.instances[1].instanceId);
  assert.deepEqual(state.instances.map((item) => item.slotIndex), [2, 14]);
  assert.equal(state.usedCircumferenceMm, 20);
});

test('moving to an occupied slot swaps the two instances', () => {
  let state = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  state = place(state, 'Tahitian Pearl', 2, 'pearl-a');
  state = place(state, 'Aquamarine', 7, 'aqua-a', 8);
  state = moveInstance(state, { instanceId: 'pearl-a', slotIndex: 7 });
  assert.equal(state.instances.find((item) => item.instanceId === 'pearl-a').slotIndex, 7);
  assert.equal(state.instances.find((item) => item.instanceId === 'aqua-a').slotIndex, 2);
});

test('placing into an occupied slot inserts the new bead and shifts the nearest run', () => {
  let state = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  state = place(state, 'Clear Quartz', 4, 'clear-a', 8);
  state = place(state, 'Smoky Quartz', 5, 'smoky-a', 8);
  state = place(state, 'Aquamarine', 6, 'aqua-a', 8);
  state = place(state, 'Tahitian Pearl', 5, 'pearl-a', 8);
  assert.equal(state.instances.length, 4);
  assert.equal(state.instances.find((item) => item.instanceId === 'clear-a').slotIndex, 4);
  assert.equal(state.instances.find((item) => item.instanceId === 'pearl-a').slotIndex, 5);
  assert.equal(state.instances.find((item) => item.instanceId === 'smoky-a').slotIndex, 6);
  assert.equal(state.instances.find((item) => item.instanceId === 'aqua-a').slotIndex, 7);
});

test('removing one duplicate leaves the other duplicate untouched', () => {
  let state = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  state = place(state, 'Tahitian Pearl', 2, 'pearl-a');
  state = place(state, 'Tahitian Pearl', 14, 'pearl-b');
  state = removeInstance(state, 'pearl-a');
  assert.deepEqual(state.instances.map((item) => [item.instanceId, item.slotIndex]), [['pearl-b', 14]]);
});

test('undo and redo restore exact serialized positions', () => {
  const initial = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  let history = createHistory(initial, 3);
  history = applyHistoryCommand(history, { type: 'place', materialName: 'Tahitian Pearl', slotIndex: 2, instanceId: 'pearl-a', sizeMm: 10 });
  const placed = serializeBraceletState(history.present);
  history = applyHistoryCommand(history, { type: 'move', instanceId: 'pearl-a', slotIndex: 9 });
  const moved = serializeBraceletState(history.present);
  history = undoHistory(history);
  assert.deepEqual(serializeBraceletState(history.present), placed);
  history = redoHistory(history);
  assert.deepEqual(serializeBraceletState(history.present), moved);
  assert.equal(history.past.length, 2);
});

test('history is bounded without corrupting the present snapshot', () => {
  let history = createHistory(createBraceletState({ wristCm: 17 }), 2);
  history = applyHistoryCommand(history, { type: 'place', materialName: 'A', slotIndex: 1, instanceId: 'a' });
  history = applyHistoryCommand(history, { type: 'place', materialName: 'B', slotIndex: 2, instanceId: 'b' });
  history = applyHistoryCommand(history, { type: 'place', materialName: 'C', slotIndex: 3, instanceId: 'c' });
  assert.equal(history.past.length, 2);
  assert.deepEqual(history.present.instances.map((item) => item.instanceId), ['a', 'b', 'c']);
});

test('a complete automatic layout is one undoable history action', () => {
  const initial = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  let arranged = place(initial, 'Aquamarine', 2, 'aqua-a', 8);
  arranged = place(arranged, 'Tahitian Pearl', 14, 'pearl-a', 10);
  let history = createHistory(initial);
  history = commitHistoryState(history, arranged);
  assert.equal(history.present.instances.length, 2);
  history = undoHistory(history);
  assert.equal(history.present.instances.length, 0);
});

test('wrist resize updates target and capacity while preserving valid placements', () => {
  let state = createBraceletState({ wristCm: 17, fallbackBeadMm: 8 });
  state = place(state, 'Aquamarine', 2, 'aqua-a', 8);
  state = setWristSize(state, 18);
  assert.equal(state.targetCircumferenceMm, 185);
  assert.equal(state.capacity, 23);
  assert.equal(state.instances[0].slotIndex, 2);
});

test('wrist resize refuses a capacity smaller than the current placed bead count', () => {
  let state = createBraceletState({ wristCm: 20, fallbackBeadMm: 8 });
  for (let slotIndex = 0; slotIndex < 22; slotIndex += 1) state = place(state, 'Clear Quartz', slotIndex, `clear-${slotIndex}`, 8);
  const resized = setWristSize(state, 15);
  assert.equal(resized, state);
  assert.equal(new Set(resized.instances.map((item) => item.slotIndex)).size, 22);
});

test('legacy material-name layouts become independent instances', () => {
  const layout = Array(22).fill(null);
  layout[2] = 'Tahitian Pearl';
  layout[14] = 'Tahitian Pearl';
  const state = createBraceletState({
    wristCm: 17,
    fallbackBeadMm: 8,
    layout,
    items: [{ name: 'Tahitian Pearl', quantity: 2, sizeMm: 10 }],
  });
  assert.equal(state.instances.length, 2);
  assert.notEqual(state.instances[0].instanceId, state.instances[1].instanceId);
  assert.deepEqual(state.instances.map((item) => item.slotIndex), [2, 14]);
});
