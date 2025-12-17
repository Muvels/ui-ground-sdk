/**
 * Build script to bundle worker files for browser use
 * Run with: node scripts/build-workers.mjs
 */
import { build } from 'esbuild';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const workerFiles = [
    {
        entry: '../dist/worker/shared-worker.js',
        output: 'public/workers/shared-worker.js',
    },
    {
        entry: '../dist/worker/dedicated-worker.js',
        output: 'public/workers/dedicated-worker.js',
    },
];

async function buildWorkers() {
    console.log('Building workers...');

    for (const worker of workerFiles) {
        const entryPoint = join(rootDir, worker.entry);
        const outfile = join(rootDir, worker.output);

        try {
            await build({
                entryPoints: [entryPoint],
                bundle: true,
                format: 'esm',
                outfile,
                minify: true,
                sourcemap: true,
                target: 'es2020',
                external: [], // Bundle everything
                platform: 'browser',
                define: {
                    'process.env.NODE_ENV': '"production"',
                },
            });
            console.log(`✓ Built ${worker.output}`);
        } catch (error) {
            console.error(`✗ Failed to build ${worker.entry}:`, error);
            process.exit(1);
        }
    }

    console.log('\nWorkers built successfully!');
    console.log('Files are in public/workers/');
}

buildWorkers();
