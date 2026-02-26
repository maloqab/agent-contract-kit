#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

const args = parseArgs(process.argv.slice(2));

if (!args.name) {
  console.error('Missing required argument: --name <contract-name>');
  process.exit(1);
}

const slug = normalizeSlug(args.name);
if (!slug) {
  console.error('Contract name must contain letters or numbers.');
  process.exit(1);
}

if (!['contract', 'both', 'behavior', 'io'].includes(args.profile)) {
  console.error('Invalid --profile value. Use one of: contract, both, behavior, io');
  process.exit(1);
}

const templateName = args.template === 'full' ? 'full' : 'minimal';
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
    force: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === '--name' && argv[i + 1]) {
      output.name = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--template' && argv[i + 1]) {
      output.template = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--profile' && argv[i + 1]) {
      output.profile = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--out' && argv[i + 1]) {
      output.out = argv[i + 1];
      i += 1;
      continue;
    }

    if (token === '--force') {
      output.force = true;
    }
  }

  return output;
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
