#!/usr/bin/env node

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { basename, resolve, relative, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import YAML from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const schemaPaths = {
  common: resolve(rootDir, 'schemas/defs.common.json'),
  lifecycle: resolve(rootDir, 'schemas/defs.lifecycle.json'),
  behavior: resolve(rootDir, 'schemas/behavior-contract.v1.schema.json'),
  io: resolve(rootDir, 'schemas/io-contract.v1.schema.json'),
  contract: resolve(rootDir, 'schemas/agent-contract.v1.schema.json')
};

const args = parseArgs(process.argv.slice(2));
const examplesDir = resolve(rootDir, args.examplesDir);
const contractsDir = resolve(rootDir, args.contractsDir);

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);

const commonSchema = JSON.parse(readFileSync(schemaPaths.common, 'utf8'));
const lifecycleSchema = JSON.parse(readFileSync(schemaPaths.lifecycle, 'utf8'));
const behaviorSchema = JSON.parse(readFileSync(schemaPaths.behavior, 'utf8'));
const ioSchema = JSON.parse(readFileSync(schemaPaths.io, 'utf8'));
const contractSchema = JSON.parse(readFileSync(schemaPaths.contract, 'utf8'));

ajv.addSchema(commonSchema);
ajv.addSchema(lifecycleSchema);
ajv.addSchema(behaviorSchema);
ajv.addSchema(ioSchema);

const validators = {
  contract: ajv.compile(contractSchema),
  behavior: ajv.getSchema(behaviorSchema.$id),
  io: ajv.getSchema(ioSchema.$id)
};

const exampleFiles = findYamlFiles(examplesDir);
const validExampleFiles = exampleFiles.filter((file) => file.endsWith('.valid.yaml'));
const invalidExampleFiles = exampleFiles.filter((file) =>
  /(?:contract|behavior|io)\.invalid\..+\.ya?ml$/i.test(file)
);
const contractFiles = findYamlFiles(contractsDir);

let failed = false;

for (const file of validExampleFiles) {
  const result = validateFile(file, validators);
  if (result.ok) {
    console.log(`PASS ${displayPath(file)}`);
  } else {
    failed = true;
    console.error(`FAIL ${displayPath(file)}`);
    printErrors(result.errors);
  }
}

for (const file of contractFiles) {
  const result = validateFile(file, validators);
  if (result.ok) {
    console.log(`PASS ${displayPath(file)}`);
  } else {
    failed = true;
    console.error(`FAIL ${displayPath(file)}`);
    printErrors(result.errors);
  }
}

for (const file of invalidExampleFiles) {
  const result = validateFile(file, validators);
  if (result.ok) {
    failed = true;
    console.error(`UNEXPECTED_PASS ${displayPath(file)}`);
    console.error('  - expected this example to fail schema/cross-link validation');
  } else {
    console.log(`EXPECTED_FAIL ${displayPath(file)}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('Validation summary: all expected checks passed.');
}

function parseArgs(argv) {
  const output = {
    examplesDir: 'examples',
    contractsDir: 'contracts'
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--examples-dir' && argv[i + 1]) {
      output.examplesDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === '--contracts-dir' && argv[i + 1]) {
      output.contractsDir = argv[i + 1];
      i += 1;
    }
  }

  return output;
}

function findYamlFiles(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findYamlFiles(fullPath));
      continue;
    }

    const ext = extname(entry.name).toLowerCase();
    if (ext === '.yaml' || ext === '.yml') {
      files.push(fullPath);
    }
  }

  return files.sort();
}

function validateFile(filePath, compiledValidators) {
  const raw = readFileSync(filePath, 'utf8');

  try {
    const parsed = YAML.parse(raw);
    const schemaType = classifyFile(filePath);
    const validator = compiledValidators[schemaType];

    if (!validator) {
      return {
        ok: false,
        errors: [`No validator available for schema type: ${schemaType}`]
      };
    }

    const schemaOk = validator(parsed);
    const schemaErrors = schemaOk
      ? []
      : (validator.errors ?? []).map((error) =>
          `${error.instancePath || '/'} ${error.message}`
        );

    const crossLinkErrors = schemaType === 'contract' ? validateCrossLinks(parsed) : [];

    const errors = [...schemaErrors, ...crossLinkErrors];
    return {
      ok: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      ok: false,
      errors: [
        `YAML_PARSE ${error instanceof Error ? error.message : String(error)}`
      ]
    };
  }
}

function classifyFile(filePath) {
  const file = basename(filePath);

  if (file.startsWith('behavior.') || file.endsWith('.behavior.yaml')) {
    return 'behavior';
  }

  if (file.startsWith('io.') || file.endsWith('.io.yaml')) {
    return 'io';
  }

  return 'contract';
}

function validateCrossLinks(contract) {
  if (!contract || typeof contract !== 'object') return [];
  if (!contract.behaviorContract || !contract.ioContract) return [];

  const usedTools = Array.isArray(contract.behaviorContract.toolsUsed)
    ? contract.behaviorContract.toolsUsed
    : [];
  const ioTools = Array.isArray(contract.ioContract.tools)
    ? contract.ioContract.tools
    : [];
  const ioToolNames = new Set(
    ioTools
      .map((tool) => tool?.name)
      .filter((toolName) => typeof toolName === 'string')
  );

  const errors = [];
  for (let i = 0; i < usedTools.length; i += 1) {
    const toolName = usedTools[i];
    if (!ioToolNames.has(toolName)) {
      errors.push(
        `CROSS_LINK /behaviorContract/toolsUsed/${i} unknown tool reference: ${toolName}`
      );
    }
  }

  return errors;
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
}

function displayPath(filePath) {
  return relative(rootDir, filePath);
}
