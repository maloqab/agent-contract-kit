#!/usr/bin/env node

import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
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

let args;
try {
  args = parseArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  printUsage();
  process.exit(1);
}

if (args.help) {
  printUsage();
  process.exit(0);
}

const examplesDir = resolve(rootDir, args.examplesDir);
const contractsDir = resolve(rootDir, args.contractsDir);

if (!existsSync(examplesDir)) {
  console.error(`Examples directory does not exist: ${examplesDir}`);
  process.exit(1);
}

if (!isDirectory(examplesDir)) {
  console.error(`Examples path is not a directory: ${examplesDir}`);
  process.exit(1);
}

if (args.contractsDirProvided && !existsSync(contractsDir)) {
  console.error(`Contracts directory does not exist: ${contractsDir}`);
  process.exit(1);
}

if (existsSync(contractsDir) && !isDirectory(contractsDir)) {
  console.error(`Contracts path is not a directory: ${contractsDir}`);
  process.exit(1);
}

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
if (exampleFiles.length === 0) {
  console.error(`No example YAML files found in: ${examplesDir}`);
  process.exit(1);
}

const validExampleFiles = exampleFiles.filter((file) => /\.valid\.ya?ml$/i.test(file));
const invalidExampleFiles = exampleFiles.filter((file) =>
  /(?:contract|behavior|io)\.invalid\..+\.ya?ml$/i.test(file)
);

if (validExampleFiles.length + invalidExampleFiles.length === 0) {
  console.error(
    `No candidate example files found (expected .valid.* or *.invalid.* patterns) in: ${examplesDir}`
  );
  process.exit(1);
}

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
    contractsDir: 'contracts',
    contractsDirProvided: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    switch (token) {
      case '--examples-dir':
        output.examplesDir = expectValue(argv, i, '--examples-dir');
        i += 1;
        break;
      case '--contracts-dir':
        output.contractsDir = expectValue(argv, i, '--contracts-dir');
        output.contractsDirProvided = true;
        i += 1;
        break;
      case '--help':
      case '-h':
        output.help = true;
        break;
      default:
        if (token.startsWith('-')) {
          throw new Error(`Unknown option: ${token}`);
        }
        throw new Error(`Unexpected argument: ${token}`);
    }
  }

  return output;
}

function expectValue(argv, index, flagName) {
  const value = argv[index + 1];
  if (!value || value.startsWith('-')) {
    throw new Error(`Missing value for ${flagName}`);
  }
  return value;
}

function printUsage() {
  console.error('Usage: npm run validate [-- --examples-dir <dir> --contracts-dir <dir>]');
  console.error('Options:');
  console.error('  --examples-dir <dir>');
  console.error('  --contracts-dir <dir>');
  console.error('  --help, -h');
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

    const contractCrossLinkErrors =
      schemaType === 'contract' ? validateCrossLinks(parsed) : [];

    const duplicateIoNameErrors =
      schemaType === 'io'
        ? findDuplicateToolErrors(parsed?.tools, '/tools')
        : [];

    const errors = [
      ...schemaErrors,
      ...contractCrossLinkErrors,
      ...duplicateIoNameErrors
    ];
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
  const file = basename(filePath).toLowerCase();

  if (/^behavior\..+\.ya?ml$/.test(file) || /\.behavior\.ya?ml$/.test(file)) {
    return 'behavior';
  }

  if (/^io\..+\.ya?ml$/.test(file) || /\.io\.ya?ml$/.test(file)) {
    return 'io';
  }

  return 'contract';
}

function validateCrossLinks(contract) {
  if (!contract || typeof contract !== 'object') return [];

  const ioTools = Array.isArray(contract.ioContract?.tools)
    ? contract.ioContract.tools
    : [];
  const ioToolNames = new Set(
    ioTools
      .map((tool) => tool?.name)
      .filter((toolName) => typeof toolName === 'string')
  );

  const errors = [
    ...findDuplicateToolErrors(ioTools, '/ioContract/tools')
  ];

  if (!contract.behaviorContract || !contract.ioContract) {
    return errors;
  }

  const usedTools = Array.isArray(contract.behaviorContract.toolsUsed)
    ? contract.behaviorContract.toolsUsed
    : [];

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

function findDuplicateToolErrors(tools, basePath) {
  if (!Array.isArray(tools)) return [];

  const seen = new Map();
  const errors = [];

  for (let i = 0; i < tools.length; i += 1) {
    const toolName = tools[i]?.name;
    if (typeof toolName !== 'string') continue;

    if (seen.has(toolName)) {
      errors.push(
        `CROSS_LINK ${basePath}/${i} duplicate tool name: ${toolName}`
      );
      continue;
    }

    seen.set(toolName, i);
  }

  return errors;
}

function isDirectory(dirPath) {
  return statSync(dirPath).isDirectory();
}

function printErrors(errors) {
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
}

function displayPath(filePath) {
  return relative(rootDir, filePath);
}
