import fs from 'node:fs';
import path from 'node:path';

const OPERATIONS = new Set(['create', 'modify', 'delete']);

export class PermissionDeniedError extends Error {
  constructor(reason) {
    super(`PERMISSION_DENIED: ${reason}`);
    this.name = 'PermissionDeniedError';
    this.code = 'PERMISSION_DENIED';
  }
}

function deny(reason) {
  throw new PermissionDeniedError(reason);
}

function pathKey(value) {
  return path.normalize(value).replace(/[\\/]+/g, path.sep).toLocaleLowerCase('en-US');
}

function isInside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function resolveFromRoot(root, value, label) {
  if (typeof value !== 'string' || value.trim() === '') deny(`${label} is required`);
  const resolved = path.isAbsolute(value) ? path.resolve(value) : path.resolve(root, value);
  if (!isInside(root, resolved)) deny(`${label} escapes repoRoot`);
  return resolved;
}

function nearestExistingAncestor(target) {
  let current = target;
  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
  return current;
}

function assertPhysicalContainment(rootReal, target) {
  const ancestor = nearestExistingAncestor(target);
  if (ancestor === null) deny('target has no existing filesystem ancestor');

  const ancestorReal = fs.realpathSync.native(ancestor);
  if (!isInside(rootReal, ancestorReal) && pathKey(ancestorReal) !== pathKey(rootReal)) {
    deny('target resolves through a symlink or junction outside repoRoot');
  }

  if (fs.existsSync(target)) {
    const targetReal = fs.realpathSync.native(target);
    if (!isInside(rootReal, targetReal)) deny('target resolves outside repoRoot');
  }
}

function authorizedPaths(root, rootReal, grant) {
  if (!Array.isArray(grant?.allow_write) || grant.allow_write.length === 0) {
    deny('allow_write is missing or empty');
  }

  return new Set(grant.allow_write.map((entry) => {
    const resolved = resolveFromRoot(root, entry, 'allow_write entry');
    assertPhysicalContainment(rootReal, resolved);
    return pathKey(resolved);
  }));
}

/**
 * Checks a proposed file operation before the caller performs any write.
 * The caller must invoke this function immediately before its filesystem call.
 */
export function authorizeOperation({ repoRoot, grant, operation, targetPath }) {
  if (!OPERATIONS.has(operation)) deny(`unsupported operation: ${operation}`);
  if (!grant || grant.permission_mode !== 'SAFE_WRITE') deny('SAFE_WRITE grant is required');
  if (!Array.isArray(grant.allowed_operations) || !grant.allowed_operations.includes(operation)) {
    deny(`operation is not granted: ${operation}`);
  }

  const root = path.resolve(repoRoot ?? '');
  if (!fs.existsSync(root)) deny('repoRoot does not exist');
  const rootReal = fs.realpathSync.native(root);
  const target = resolveFromRoot(root, targetPath, 'targetPath');
  assertPhysicalContainment(rootReal, target);

  const allowed = authorizedPaths(root, rootReal, grant);
  if (!allowed.has(pathKey(target))) deny('targetPath is not exactly allowlisted');

  const exists = fs.existsSync(target);
  if (operation === 'create' && exists) deny('create target already exists');
  if ((operation === 'modify' || operation === 'delete') && !exists) {
    deny(`${operation} target does not exist`);
  }

  return { decision: 'ALLOW', operation, targetPath: target };
}
