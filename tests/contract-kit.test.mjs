import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const contractsDir = join(cwd, 'contracts');
const examplesDir = join(cwd, 'examples');
const generatedContract = join(contractsDir, 'tdd-generated.yaml');
const generatedBothContract = join(contractsDir, 'tdd-both.yaml');
const brokenContract = join(contractsDir, 'tdd-broken.yaml');
const unknownToolContract = join(contractsDir, 'tdd-unknown-tool.yaml');
const draftMismatchContract = join(contractsDir, 'tdd-draft-mismatch.yaml');
const behaviorYmlContract = join(contractsDir, 'tdd-profile.behavior.yml');
const ioYmlContract = join(contractsDir, 'tdd-profile.io.yml');
const validYmlExample = join(examplesDir, 'contract.extra.valid.yml');

function runNodeScript(script, args = []) {
  return spawnSync('node', [script, ...args], {
    cwd,
    encoding: 'utf8'
  });
}

test('new-contract creates a minimal contract scaffold', () => {
  rmSync(generatedContract, { force: true });

  const result = runNodeScript('scripts/new-contract.mjs', [
    '--name',
    'tdd-generated',
    '--template',
    'minimal',
    '--out',
    generatedContract,
    '--force'
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(generatedContract), true, 'expected generated contract file');

  const content = readFileSync(generatedContract, 'utf8');
  assert.match(content, /contractVersion: 1\.0\.0/);
  assert.match(content, /lifecycle:\n  status: draft/);

  rmSync(generatedContract, { force: true });
});

test('new-contract defaults output to contracts/<name>.yaml', () => {
  const defaultOutFile = join(contractsDir, 'quickstart-sample.yaml');
  rmSync(defaultOutFile, { force: true });

  const result = runNodeScript('scripts/new-contract.mjs', [
    '--name',
    'quickstart-sample'
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(defaultOutFile), true, 'expected default output path file');

  rmSync(defaultOutFile, { force: true });
});

test('new-contract supports --profile both while keeping existing UX', () => {
  rmSync(generatedBothContract, { force: true });

  const result = runNodeScript('scripts/new-contract.mjs', [
    '--name',
    'tdd-both',
    '--profile',
    'both'
  ]);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(existsSync(generatedBothContract), true, 'expected both profile contract file');

  const content = readFileSync(generatedBothContract, 'utf8');
  assert.match(content, /behaviorContract:/);
  assert.match(content, /ioContract:/);

  rmSync(generatedBothContract, { force: true });
});

test('new-contract fails fast on unknown CLI flags', () => {
  const unknownFlagOutput = join(contractsDir, 'tdd-unknown-flag.yaml');
  rmSync(unknownFlagOutput, { force: true });

  const result = runNodeScript('scripts/new-contract.mjs', [
    '--name',
    'tdd-unknown-flag',
    '--wat'
  ]);

  rmSync(unknownFlagOutput, { force: true });

  assert.notEqual(result.status, 0, 'expected non-zero exit for unknown flag');
  assert.match(result.stdout + result.stderr, /Usage:/);
  assert.match(result.stdout + result.stderr, /Unknown option: --wat/);
});

test('validate-contracts passes valid examples and detects invalid examples', () => {
  const result = runNodeScript('scripts/validate-contracts.mjs');

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\s+examples\/contract\.minimal\.valid\.yaml/);
  assert.match(result.stdout, /PASS\s+examples\/contract\.full\.valid\.yaml/);
  assert.match(result.stdout, /PASS\s+examples\/behavior\.valid\.yaml/);
  assert.match(result.stdout, /PASS\s+examples\/io\.valid\.yaml/);
  assert.match(result.stdout, /EXPECTED_FAIL\s+examples\/contract\.invalid\./);
  assert.match(result.stdout, /EXPECTED_FAIL\s+examples\/behavior\.invalid\./);
  assert.match(result.stdout, /EXPECTED_FAIL\s+examples\/io\.invalid\./);
});

test('validate-contracts fails fast on unknown CLI flags', () => {
  const result = runNodeScript('scripts/validate-contracts.mjs', ['--wat']);

  assert.notEqual(result.status, 0, 'expected non-zero exit for unknown flag');
  assert.match(result.stdout + result.stderr, /Usage:/);
  assert.match(result.stdout + result.stderr, /Unknown option: --wat/);
});

test('validate-contracts includes .valid.yml files in valid sweep', () => {
  writeFileSync(
    validYmlExample,
    `contractVersion: 1.0.0\nid: ac-extra-valid\ntitle: Extra valid yml example\nobjective: Ensure .valid.yml is included in the valid scan.\nscope:\n  in: scan .valid.yml files\n  out: no additional output\ndeliverables:\n  - name: extra\n    path: examples/contract.extra.valid.yml\n    owner: coder\nconstraints:\n  - keep it valid\nacceptanceCriteria:\n  - validator marks this file PASS\nverification:\n  commands:\n    - npm run validate\n  successSignal: should pass\nhandoff:\n  owner: orchestrator\n  channel: '#orchestrator'\nlifecycle:\n  status: draft\n`
  );

  const result = runNodeScript('scripts/validate-contracts.mjs');

  rmSync(validYmlExample, { force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\s+examples\/contract\.extra\.valid\.yml/);
});

test('validate-contracts classifies .behavior.yml and .io.yml contract files', () => {
  writeFileSync(
    behaviorYmlContract,
    `role: coding-agent\nobjective: Validate behavior classification for .behavior.yml files.\nguardrails:\n  - no destructive actions\nescalation:\n  when:\n    - ambiguous requirements\n  action: ask-first\noutputContract:\n  format: markdown\n  requiredSections:\n    - summary\ntoolsUsed:\n  - git\n`
  );

  writeFileSync(
    ioYmlContract,
    `tools:\n  - name: git\n    inputSchema:\n      type: object\n    outputSchema:\n      type: object\n    errorSchema:\n      type: object\n    policy:\n      timeoutMs: 60000\n      retry:\n        maxAttempts: 1\n        backoff: none\n        idempotent: false\n`
  );

  const result = runNodeScript('scripts/validate-contracts.mjs');

  rmSync(behaviorYmlContract, { force: true });
  rmSync(ioYmlContract, { force: true });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /PASS\s+contracts\/tdd-profile\.behavior\.yml/);
  assert.match(result.stdout, /PASS\s+contracts\/tdd-profile\.io\.yml/);
});

test('validate-contracts fails when draft status mismatches transition.to', () => {
  writeFileSync(
    draftMismatchContract,
    `contractVersion: 1.0.0\nid: ac-draft-mismatch\ntitle: Draft mismatch\nobjective: Ensure lifecycle status matches transition.to for all statuses.\nscope:\n  in: validate draft mismatch\n  out: out of scope\ndeliverables:\n  - name: mismatch\n    path: contracts/tdd-draft-mismatch.yaml\n    owner: coder\nconstraints:\n  - none\nacceptanceCriteria:\n  - draft mismatch should fail\nverification:\n  commands:\n    - npm run validate\n  successSignal: should fail\nhandoff:\n  owner: orchestrator\n  channel: '#orchestrator'\nlifecycle:\n  status: draft\n  transition:\n    from: draft\n    to: ready\n    reason: mismatch test\n`
  );

  const result = runNodeScript('scripts/validate-contracts.mjs');

  rmSync(draftMismatchContract, { force: true });

  assert.notEqual(result.status, 0, 'expected non-zero exit for draft mismatch');
  assert.match(result.stdout + result.stderr, /contracts\/tdd-draft-mismatch\.yaml/);
  assert.match(result.stdout + result.stderr, /lifecycle\/transition/);
});

test('validate-contracts returns non-zero with per-file errors for bad transition', () => {
  writeFileSync(
    brokenContract,
    `contractVersion: 1.0.0\nid: ac-broken\ntitle: Broken\nobjective: invalid transition\nscope:\n  in: tests only\n  out: none here\ndeliverables:\n  - name: test\n    path: test.md\n    owner: coder\nconstraints:\n  - none\nacceptanceCriteria:\n  - must fail\nverification:\n  commands:\n    - echo test\n  successSignal: should fail\nhandoff:\n  owner: coder\n  channel: '#coder'\nlifecycle:\n  status: done\n  transition:\n    from: draft\n    to: done\n    reason: invalid jump\n`
  );

  const result = runNodeScript('scripts/validate-contracts.mjs');

  rmSync(brokenContract, { force: true });

  assert.notEqual(result.status, 0, 'expected non-zero exit for invalid contract');
  assert.match(result.stdout + result.stderr, /contracts\/tdd-broken\.yaml/);
  assert.match(result.stdout + result.stderr, /lifecycle\/transition/);
});

test('validate-contracts returns non-zero on unknown-tool cross-link failure', () => {
  writeFileSync(
    unknownToolContract,
    `contractVersion: 1.0.0\nid: ac-unknown-tool\ntitle: Unknown tool cross-link contract\nobjective: Ensure cross-link checks run in npm run validate.\nscope:\n  in: cross-link validation\n  out: no extra scope\ndeliverables:\n  - name: Cross-link test\n    path: contracts/tdd-unknown-tool.yaml\n    owner: coder\nconstraints:\n  - none\nacceptanceCriteria:\n  - unknown tools are rejected\nverification:\n  commands:\n    - npm run validate\n  successSignal: validator should fail\nhandoff:\n  owner: orchestrator\n  channel: '#orchestrator'\nlifecycle:\n  status: draft\nbehaviorContract:\n  role: coding-agent\n  objective: execute tasks safely\n  guardrails:\n    - no destructive operations\n  escalation:\n    when:\n      - destructive action requested\n    action: ask-first\n  outputContract:\n    format: markdown\n    requiredSections:\n      - summary\n  toolsUsed:\n    - gh\nioContract:\n  tools:\n    - name: git\n      inputSchema:\n        type: object\n        required:\n          - command\n      outputSchema:\n        type: object\n      errorSchema:\n        type: object\n      policy:\n        timeoutMs: 30000\n        retry:\n          maxAttempts: 1\n          backoff: none\n          idempotent: false\n`
  );

  const result = runNodeScript('scripts/validate-contracts.mjs');

  rmSync(unknownToolContract, { force: true });

  assert.notEqual(result.status, 0, 'expected non-zero exit for cross-link failure');
  assert.match(result.stdout + result.stderr, /contracts\/tdd-unknown-tool\.yaml/);
  assert.match(result.stdout + result.stderr, /CROSS_LINK/);
  assert.match(result.stdout + result.stderr, /unknown tool reference: gh/);
});
