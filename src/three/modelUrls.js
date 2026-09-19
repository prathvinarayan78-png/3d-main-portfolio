/*
  The animal GLBs are imported with `?inlineglb` (see the plugin in
  vite.config.js), which bundles each one as a base64 data URI rather than a
  file the browser has to fetch.

  Why: served from public/ these are real binary HTTP responses, and the
  preview proxy answers those with 502. A single failed fetch throws inside the
  Canvas subtree and blanks the entire 3D scene. Inlining removes the network
  round-trip altogether, so the models cannot fail to load.

  Cost is ~780 KB of base64 in the bundle for ~588 KB of models.
*/
import Flamingo from '../models/Flamingo.glb?inlineglb';
import Fox from '../models/Fox.glb?inlineglb';
import Horse from '../models/Horse.glb?inlineglb';
import Parrot from '../models/Parrot.glb?inlineglb';
import Stork from '../models/Stork.glb?inlineglb';

export const MODEL_URLS = {
  'Flamingo.glb': Flamingo,
  'Fox.glb': Fox,
  'Horse.glb': Horse,
  'Parrot.glb': Parrot,
  'Stork.glb': Stork,
};

export const urlFor = (file) => {
  const url = MODEL_URLS[file];
  // Fail loudly here rather than deep inside the glTF loader, where a missing
  // url surfaces as an opaque "cannot read properties of undefined".
  if (!url) throw new Error(`No inlined model for "${file}"`);
  return url;
};

