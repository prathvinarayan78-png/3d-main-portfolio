import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-only: pipe browser errors into the terminal so client-side crashes are
// visible without a browser devtools console.
const errorSink = {
  name: 'error-sink',
  configureServer(server) {
    server.middlewares.use('/__err', (req, res) => {
      let body = '';
      req.on('data', (c) => (body += c));
      req.on('end', () => {
        console.error('\n\u001b[31m[browser]\u001b[0m ' + body + '\n');
        res.statusCode = 204;
        res.end();
      });
    });
  },
};

/*
  Inline .glb files imported with `?inlineglb` as base64 data URIs.

  The preview proxy returns 502 for binary responses, so any model fetched over
  HTTP fails and blanks the 3D scene. Bundling them into the JS removes the
  network request entirely. Vite has no built-in `?inline` for arbitrary
  binaries, so this does the encoding. The query is deliberately custom rather
  than `?inline` so it cannot collide with Vite's own asset-inlining rules.
*/
const inlineGlb = {
  name: 'inline-glb',
  enforce: 'pre',
  async load(id) {
    const [file, query] = id.split('?');
    // Vite rewrites the query (e.g. `?import&inlineglb`), so test for the flag.
    if (!file.endsWith('.glb')) return null;
    const flags = new URLSearchParams(query);
    // `inline` is accepted too so an already-open tab holding the previous
    // module graph doesn't hard-error before it reloads.
    if (!flags.has('inlineglb') && !flags.has('inline')) return null;
    const buf = await readFile(file);
    const uri = `data:model/gltf-binary;base64,${buf.toString('base64')}`;
    return `export default ${JSON.stringify(uri)};`;
  },
};

export default defineConfig({
  plugins: [react(), errorSink, inlineGlb],
  server: { host: '0.0.0.0', port: 5173, allowedHosts: true },
});
