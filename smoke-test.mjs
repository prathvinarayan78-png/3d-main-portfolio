/* Headless smoke test: builds the full scene graph and runs render frames
   against a stubbed WebGL context. Catches runtime API misuse. */

function fake2d() {
  return {
    fillStyle: null,
    fillRect() {},
    createRadialGradient() {
      return { addColorStop() {} };
    },
    createLinearGradient() {
      return { addColorStop() {} };
    },
  };
}

function fakeCanvas() {
  return {
    width: 800,
    height: 600,
    style: {},
    addEventListener() {},
    removeEventListener() {},
    getContext(type) {
      if (type === '2d') return fake2d();
      return makeFakeGL();
    },
  };
}

let objId = 0;
const GL_CONSTANTS = {
  VERSION: 'WebGL 2.0 (fake)',
  RENDERER: 'Smoke / StubGL',
  VENDOR: 'Smoke',
  ACTIVE_UNIFORMS: 35718,
  ACTIVE_ATTRIBUTES: 37321,
  COMPILE_STATUS: 35713,
  LINK_STATUS: 35714,
  SHADER_TYPE: 1030,
  DELETE_STATUS: 35725,
  CURRENT_PROGRAM: 35725,
  INFO_LOG_LENGTH: 35716,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 8,
  MAX_TEXTURE_IMAGE_UNITS: 8,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 8,
  MAX_CUBE_MAP_TEXTURE_SIZE: 2048,
  MAX_RENDERBUFFER_SIZE: 2048,
  MAX_TEXTURE_SIZE: 2048,
  MAX_VIEWPORT_DIMS: [800, 600],
  MAX_COLOR_ATTACHMENTS: 4,
  MAX_VERTEX_UNIFORM_VECTORS: 1024,
  MAX_FRAGMENT_UNIFORM_VECTORS: 1024,
};
function makeFakeGL() {
  const store = {};
  return new Proxy(
    {},
    {
      get(t, prop) {
        if (prop === 'drawingBufferWidth') return 800;
        if (prop === 'drawingBufferHeight') return 600;
        if (typeof prop === 'string' && /^[A-Z][A-Z0-9_]*$/.test(prop)) {
          return prop in GL_CONSTANTS ? GL_CONSTANTS[prop] : 1;
        }
        if (prop in store) return store[prop];
        const fn = (...args) => {
          switch (prop) {
            case 'createShader':
            case 'createProgram':
            case 'createBuffer':
            case 'createTexture':
            case 'createFramebuffer':
            case 'createRenderbuffer':
            case 'createVertexArray':
            case 'createSampler':
              return { id: ++objId };
            case 'getParameter': {
              const n = args[0];
              if (typeof n === 'string') return n; // VERSION/RENDERER already resolved
              if (n === 37445) return GL_CONSTANTS.VERSION;
              if (n === 37446) return GL_CONSTANTS.RENDERER;
              return 16;
            }
            case 'getShaderParameter':
              return args[1] === 35713 ? true : args[1] === 1030 ? 35633 : 0; // COMPILE_STATUS
            case 'getProgramParameter':
              // args[1]: 35718 = ACTIVE_UNIFORMS, 37321 = ACTIVE_ATTRIBUTES
              return (args[1] === 35718 || args[1] === 37321) ? 0 : true;
            case 'getShaderInfoLog':
            case 'getProgramInfoLog':
              return '';
            case 'getActiveUniform':
            case 'getActiveAttrib':
              return null;
            case 'getUniformLocation':
            case 'getFragDataLocation':
              return null;
            case 'getAttribLocation':
            case 'getUniformIndex':
              return -1;
            case 'getError':
              return 0;
            case 'checkFramebufferStatus':
              return 36052; // FRAMEBUFFER_COMPLETE
            case 'getExtension':
              return null;
            case 'getShaderPrecisionFormat':
              return { rangeMin: 127, rangeMax: 127, precision: 23 };
            case 'getFramebufferAttachmentParameter':
            case 'getRenderbufferParameter':
              return 3553; // TEXTURE_2D-ish
            case 'getInternalFormatParameter':
              return 5121;
            case 'isContextLost':
              return false;
            case 'getCompressedTextureSizes':
              return [];
            default:
              return undefined;
          }
        };
        store[prop] = fn;
        return fn;
      },
      set(t, prop, v) {
        store[prop] = v;
        return true;
      },
    }
  );
}

/* --- browser globals --- */
globalThis.window = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener() {},
  removeEventListener() {},
};
globalThis.matchMedia = () => ({ matches: false });
globalThis.document = {
  createElement: (tag) => (tag === 'canvas' ? fakeCanvas() : {}),
};

const { createScene } = await import('./src/scene.js');
const hovers = [];
const api = createScene(fakeCanvas(), { onHover: (l) => hovers.push(l) });

api.introStart();
for (let i = 0; i <= 60; i++) {
  api.update(i / 60, Math.sin(i / 9) * 0.5, Math.cos(i / 7) * 0.3, 0.016);
}
console.log('SCENE OK — 61 frames rendered, hovers:', hovers.length);
