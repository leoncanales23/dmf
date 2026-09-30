'use strict';

// The frozen-path guards in the visual layer suites (V2 … V8) keep a *visual* PR out of payments, auth,
// entitlement, signing and binary assets by comparing the branch with origin/main. They apply to branches
// that change a visual layer module (scripts/overdrive/*.js, tests excluded): a branch that mixes the stage
// with commerce still fails. A branch that does not touch the stage (a commerce change: prices, providers)
// is governed by its own suites (workers/*/test, scripts/overdrive/test/commerce.test.cjs) instead.
// Returns the merge-base to compare with, or null (no origin/main — a shallow CI checkout — or not a visual branch).
const { execSync } = require('child_process');

module.exports = function visualBase(root) {
  const git = (cmd) => execSync(cmd, { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  let base;
  try { base = git('git merge-base HEAD origin/main'); } catch (e) { return null; }
  if (!base) return null;
  const layer = git('git diff --name-only ' + base + " -- scripts/overdrive ':!scripts/overdrive/test'");
  return layer ? base : null;
};
