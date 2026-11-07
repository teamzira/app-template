#!/usr/bin/env node
/**
 * Builds the shareable preview of the sample apps: one static HTML page that runs all three in the
 * browser on sample rows, with no server and no Teambridge account.
 *
 *   node preview/build.mjs      → preview/dist/index.html
 *
 * Each sample is checked out from its branch (samples/<name>) into preview/.work/, and its own
 * AppShell, pages and loaders are bundled as they are. Only the edges are swapped: Next's router,
 * the Teambridge client (it serves preview/fixtures.ts) and the host's record panel.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import esbuild from 'esbuild';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import * as sass from 'sass';

// The same mapping as withAlloy's (Alloy's icon-name.cjs, which the package doesn't export):
// `General/x-close` → `@teamzira/alloy/icons-js/General/XCloseIcon`.
function toIconsJsRequest(iconPath) {
  const segments = iconPath.split('/');
  const base = segments.pop() ?? '';
  const name = `${base.split(/[-_]/).map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join('')}Icon`;
  return `@teamzira/alloy/icons-js/${[...segments, name].join('/')}`;
}

const previewDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.dirname(previewDir);
const workDir = path.join(previewDir, '.work');
const distDir = path.join(previewDir, 'dist');
const alloySrc = path.join(repoRoot, 'node_modules', '@teamzira', 'alloy', 'src');

export const SAMPLES = [
  { name: 'timesheet', label: 'Timesheet', nav: 'No nav: one page' },
  { name: 'client-portal', label: 'Client portal', nav: 'Tabs, pink accent' },
  { name: 'job-orders', label: 'Job orders', nav: 'Tabs, purple accent' },
  { name: 'scheduling', label: 'Scheduling', nav: 'Sidebar with a folder, purple accent' },
  { name: 'staffing', label: 'Staffing', nav: 'Sidebar, green accent' },
];

const git = (...args) => execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).trim();

function branchRef(name) {
  const local = `samples/${name}`;
  try {
    git('rev-parse', '--verify', '--quiet', local);
    return local;
  } catch {
    return `origin/${local}`;
  }
}

/** A detached checkout of the sample's branch, sharing this checkout's node_modules. */
function checkout(name) {
  const dir = path.join(workDir, name);
  const ref = branchRef(name);
  if (existsSync(dir)) git('-C', dir, 'checkout', '--quiet', '--detach', ref);
  else git('worktree', 'add', '--quiet', '--detach', dir, ref);
  const modules = path.join(dir, 'node_modules');
  if (!existsSync(modules)) symlinkSync(path.join(repoRoot, 'node_modules'), modules, 'dir');
  return dir;
}

const SHIMS = {
  'next/navigation': 'shims/next-navigation.ts',
  '@/lib/teambridge': 'shims/teambridge.ts',
  '@/lib/teambridge/router': 'shims/teambridge-router.tsx',
  '@/components/setup-notice': 'shims/setup-notice.tsx',
};

function previewPlugin(sampleDir, name) {
  return {
    name: 'preview',
    setup(build) {
      build.onResolve({ filter: /^preview-app-routes$/ }, () => ({ path: path.join(previewDir, 'apps', `${name}.tsx`) }));
      build.onResolve({ filter: /^(next\/navigation|@\/lib\/teambridge(\/router)?|@\/components\/setup-notice)$/ }, (args) => ({
        path: path.join(previewDir, SHIMS[args.path]),
      }));
      // `@/` is the sample's root, whoever imports it (the shims read the sample's schema helpers).
      build.onResolve({ filter: /^@\// }, (args) =>
        build.resolve(`./${args.path.slice(2)}`, { kind: args.kind, resolveDir: sampleDir })
      );
      // Alloy's own source imports icons as `.svg?react`; withAlloy points those at the built
      // icon modules, and so does this.
      build.onResolve({ filter: /^@teamzira\/alloy\/icons\/.+\.svg\?react$/ }, (args) =>
        build.resolve(toIconsJsRequest(args.path.replace(/^@teamzira\/alloy\/icons\//, '').replace(/\.svg\?react$/, '')), {
          kind: args.kind,
          resolveDir: args.resolveDir,
        })
      );
      // Alloy exports its components as extensionless source paths, which Next probes and esbuild
      // doesn't, so they resolve to the source file here.
      build.onResolve({ filter: /^@teamzira\/alloy\/(components|hooks|CatalystUIKit|icons)\/[^.?]+$/ }, (args) =>
        build.resolve(path.join(alloySrc, args.path.replace(/^@teamzira\/alloy\//, '')), {
          kind: args.kind,
          resolveDir: args.resolveDir,
        })
      );
      build.onLoad({ filter: /\.scss$/ }, (args) => ({ contents: sass.compile(args.path).css, loader: 'css' }));
    },
  };
}

async function bundle({ name, label }, sampleDir) {
  const result = await esbuild.build({
    entryPoints: [path.join(previewDir, 'entry.tsx')],
    bundle: true,
    write: false,
    outdir: path.join(workDir, `${name}-out`),
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    jsx: 'automatic',
    minify: true,
    legalComments: 'none',
    define: { __PREVIEW_APP__: JSON.stringify(name), __PREVIEW_LABEL__: JSON.stringify(label), 'process.env.NODE_ENV': '"production"' },
    loader: { '.svg': 'dataurl' },
    plugins: [previewPlugin(sampleDir, name)],
    logLevel: 'warning',
  });
  const js = result.outputFiles.find((f) => f.path.endsWith('.js'))?.text ?? '';
  const css = result.outputFiles.find((f) => f.path.endsWith('.css'))?.text ?? '';
  return { js, css };
}

async function tailwindCss(sampleDirs) {
  const globals = path.join(repoRoot, 'app', 'globals.css');
  const sources = [previewDir, ...sampleDirs.flatMap((dir) => [path.join(dir, 'app'), path.join(dir, 'components')])]
    .map((dir) => `@source "${dir}";`)
    .join('\n');
  const input = `${readFileSync(globals, 'utf8')}\n${sources}\n`;
  const result = await postcss([tailwind({ optimize: { minify: true } })]).process(input, { from: globals });
  return result.css;
}

// Inline scripts end at the first `</script`, wherever it appears.
const inlineScript = (js) => js.replace(/<\/script/gi, '<\\/script');

async function main() {
  mkdirSync(workDir, { recursive: true });
  const built = [];
  for (const sample of SAMPLES) {
    const dir = checkout(sample.name);
    console.log(`Bundling ${sample.label} from ${branchRef(sample.name)}`);
    built.push({ ...sample, dir, ...(await bundle(sample, dir)) });
  }
  const css = [await tailwindCss(built.map((b) => b.dir)), ...built.map((b) => b.css)].join('\n');

  const samples = JSON.stringify(SAMPLES);
  const html = readFileSync(path.join(previewDir, 'page.html'), 'utf8')
    .replace('/* PREVIEW_CSS */', () => css)
    .replace('/* PREVIEW_SAMPLES */', () => samples)
    .replace(
      '<!-- PREVIEW_SCRIPTS -->',
      () => built.map((b) => `<script>${inlineScript(b.js)}</script>`).join('\n')
    );

  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, { recursive: true });
  writeFileSync(path.join(distDir, 'index.html'), html);
  console.log(`Wrote preview/dist/index.html (${(html.length / 1024 / 1024).toFixed(1)} MB)`);
}

await main();
