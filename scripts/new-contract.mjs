#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

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

if (!args.name) {
  console.error('Missing required argument: --name <contract-name>');
  printUsage();
  process.exit(1);
}

const slug = normalizeSlug(args.name);
if (!slug) {
  console.error('Contract name must contain letters or numbers.');
  process.exit(1);
}

if (!['contract', 'both', 'behavior', 'io'].includes(args.profile)) {
  console.error('Invalid --profile value. Use one of: contract, both, behavior, io');
  printUsage();
  process.exit(1);
}

if (!['minimal', 'full'].includes(args.template)) {
  console.error('Invalid --template value. Use one of: minimal, full');
  printUsage();
  process.exit(1);
}

const templateName = args.template;
const outputPath = resolve(rootDir, args.out || defaultOutputPath(slug, args.profile));

if (existsSync(outputPath) && !args.force) {
  console.error(`Output file already exists: ${outputPath}`);
  console.error('Use --force to overwrite.');
  process.exit(1);
}

const nowIso = new Date().toISOString();
const replacements = {
  '{{id}}': `ac-${slug}`,
  '{{title}}': toTitleCase(slug.replace(/-/g, ' ')),
  '{{timestamp}}': nowIso
};

let rendered = '';
if (args.profile === 'behavior') {
  rendered = renderTemplate('templates/behavior.contract.v1.yaml', replacements);
} else if (args.profile === 'io') {
  rendered = renderTemplate('templates/io.contract.v1.yaml', replacements);
} else if (args.profile === 'both') {
  const contractBase = renderTemplate(
    `templates/contract.${templateName}.v1.yaml`,
    replacements
  );
  const behavior = renderTemplate('templates/behavior.contract.v1.yaml', replacements);
  const io = renderTemplate('templates/io.contract.v1.yaml', replacements);

  rendered = `${contractBase}\nbehaviorContract:\n${indent(behavior, 2)}\nioContract:\n${indent(io, 2)}\n`;
} else {
  rendered = renderTemplate(`templates/contract.${templateName}.v1.yaml`, replacements);
}

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, rendered);

console.log(`Created ${outputPath}`);
console.log('Next steps:');
console.log('  1) Edit the contract fields');
console.log('  2) Run npm run validate');

function parseArgs(argv) {
  const output = {
    name: '',
    template: 'minimal',
    profile: 'contract',
    out: undefined,
    force: false,
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    switch (token) {
      case '--name':
        output.name = expectValue(argv, i, '--name');
        i += 1;
        break;
      case '--template':
        output.template = expectValue(argv, i, '--template');
        i += 1;
        break;
      case '--profile':
        output.profile = expectValue(argv, i, '--profile');
        i += 1;
        break;
      case '--out':
        output.out = expectValue(argv, i, '--out');
        i += 1;
        break;
      case '--force':
        output.force = true;
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
  console.error('Usage: npm run new -- --name <contract-name> [options]');
  console.error('Options:');
  console.error('  --template <minimal|full>');
  console.error('  --profile <contract|both|behavior|io>');
  console.error('  --out <path>');
  console.error('  --force');
  console.error('  --help, -h');
}

function defaultOutputPath(slug, profile) {
  if (profile === 'behavior') {
    return `contracts/${slug}.behavior.yaml`;
  }

  if (profile === 'io') {
    return `contracts/${slug}.io.yaml`;
  }

  return `contracts/${slug}.yaml`;
}

function renderTemplate(templateRelativePath, replacements) {
  const templatePath = resolve(rootDir, templateRelativePath);
  const template = readFileSync(templatePath, 'utf8');

  return Object.entries(replacements).reduce(
    (acc, [token, value]) => acc.replaceAll(token, value),
    template
  );
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function normalizeSlug(input) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toTitleCase(text) {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}
