"use client";

import { loadCartoonImage } from "@/lib/cartoonImageCache";

const MAX_RENDER_WIDTH = 1400;
const POSITIONS = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);

const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const COPY_SHADER = `
  precision highp float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;
  void main() { gl_FragColor = texture2D(u_texture, v_texCoord); }
`;

const LAYER_SHADER = `
  precision highp float;
  uniform sampler2D u_texture;
  uniform sampler2D u_mask;
  uniform float u_hasMask;
  uniform float u_targetH;
  uniform float u_targetS;
  uniform float u_targetV;
  uniform float u_baseH;
  uniform float u_baseS;
  uniform float u_baseV;
  varying vec2 v_texCoord;

  float normalizeHue(float hue) { return mod(mod(hue, 360.0) + 360.0, 360.0); }
  float hueOffset(float hue, float baseHue) {
    return normalizeHue(hue - baseHue + 180.0) - 180.0;
  }
  vec3 rgbToHsv(vec3 color) {
    float cMax = max(max(color.r, color.g), color.b);
    float cMin = min(min(color.r, color.g), color.b);
    float delta = cMax - cMin;
    float hue = 0.0;
    if (delta > 0.00001) {
      if (cMax == color.r) hue = 60.0 * mod((color.g - color.b) / delta, 6.0);
      else if (cMax == color.g) hue = 60.0 * (((color.b - color.r) / delta) + 2.0);
      else hue = 60.0 * (((color.r - color.g) / delta) + 4.0);
    }
    return vec3(normalizeHue(hue), cMax <= 0.0 ? 0.0 : delta / cMax, cMax);
  }
  vec3 hsvToRgb(vec3 hsv) {
    float hue = normalizeHue(hsv.x);
    float saturation = clamp(hsv.y, 0.0, 1.0);
    float value = clamp(hsv.z, 0.0, 1.0);
    float chroma = value * saturation;
    float huePrime = hue / 60.0;
    float x = chroma * (1.0 - abs(mod(huePrime, 2.0) - 1.0));
    float matchValue = value - chroma;
    vec3 rgb = vec3(0.0);
    if (huePrime < 1.0) rgb = vec3(chroma, x, 0.0);
    else if (huePrime < 2.0) rgb = vec3(x, chroma, 0.0);
    else if (huePrime < 3.0) rgb = vec3(0.0, chroma, x);
    else if (huePrime < 4.0) rgb = vec3(0.0, x, chroma);
    else if (huePrime < 5.0) rgb = vec3(x, 0.0, chroma);
    else rgb = vec3(chroma, 0.0, x);
    return rgb + vec3(matchValue);
  }
  void main() {
    vec4 source = texture2D(u_texture, v_texCoord);
    float maskAlpha = mix(1.0, texture2D(u_mask, v_texCoord).a, u_hasMask);
    float alpha = source.a * maskAlpha;
    if (alpha <= 0.001) discard;
    vec3 hsv = rgbToHsv(source.rgb);
    vec3 shifted = hsvToRgb(vec3(
      u_targetH + hueOffset(hsv.x, u_baseH),
      hsv.y * (u_targetS / max(u_baseS, 0.001)),
      hsv.z * (u_targetV / max(u_baseV, 0.001))
    ));
    gl_FragColor = vec4(shifted, alpha);
  }
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) || "Visual shader failed.");
  }
  return shader;
}

function createProgram(gl, fragmentSource) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = gl.createProgram();
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) || "Visual program failed.");
  }
  return program;
}

function createTexture(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // The WebGL frame is copied into a 2D canvas, so the DOM-image upload must
  // keep its native row order. Flipping here would invert the final bitmap.
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  return {
    texture,
    width: image.naturalWidth || image.width,
    height: image.naturalHeight || image.height,
  };
}

function coverTexCoords(texture, width, height) {
  const imageRatio = texture.width / texture.height;
  const canvasRatio = width / height;
  let left = 0;
  let right = 1;
  let top = 0;
  let bottom = 1;
  if (imageRatio > canvasRatio) {
    const visible = canvasRatio / imageRatio;
    left = (1 - visible) / 2;
    right = 1 - left;
  } else if (imageRatio < canvasRatio) {
    const visible = imageRatio / canvasRatio;
    top = (1 - visible) / 2;
    bottom = 1 - top;
  }
  return new Float32Array([
    left, bottom, right, bottom, left, top,
    left, top, right, bottom, right, top,
  ]);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

class VisualRenderService {
  constructor() {
    this.canvas =
      typeof OffscreenCanvas === "function"
        ? new OffscreenCanvas(1, 1)
        : document.createElement("canvas");
    this.gl = this.canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: false,
      stencil: false,
    });
    if (!this.gl) throw new Error("WebGL is not available.");
    const gl = this.gl;
    this.copyProgram = createProgram(gl, COPY_SHADER);
    this.layerProgram = createProgram(gl, LAYER_SHADER);
    this.positionBuffer = gl.createBuffer();
    this.texCoordBuffer = gl.createBuffer();
    this.textureCache = new Map();
    this.queue = [];
    this.isRendering = false;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, POSITIONS, gl.STATIC_DRAW);
  }

  texture(src) {
    if (!src) return Promise.resolve(null);
    if (!this.textureCache.has(src)) {
      const texture = loadCartoonImage(src)
        .then((image) => createTexture(this.gl, image))
        .catch((error) => {
          this.textureCache.delete(src);
          throw error;
        });
      this.textureCache.set(src, texture);
    }
    return this.textureCache.get(src);
  }

  bind(program, texture, width, height) {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const position = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, coverTexCoords(texture, width, height), gl.DYNAMIC_DRAW);
    const texCoord = gl.getAttribLocation(program, "a_texCoord");
    gl.enableVertexAttribArray(texCoord);
    gl.vertexAttribPointer(texCoord, 2, gl.FLOAT, false, 0, 0);
  }

  render(request) {
    return new Promise((resolve, reject) => {
      // Newly visible cards and the newest slider value should render first.
      this.queue.unshift({ prepared: this.prepare(request), resolve, reject });
      this.processQueue();
    });
  }

  async prepare({ baseSrc, sourceSrc, layers, color, width }) {
    const needsSharedSource = layers.some((layer) => !layer.sourcePath);
    const basePromise = this.texture(baseSrc);
    const sourcePromise =
      needsSharedSource && sourceSrc
        ? this.texture(sourceSrc)
        : Promise.resolve(null);
    const layersPromise = Promise.all(
      layers.map(async (layer) => ({
        texture: layer.sourcePath
          ? await this.texture(layer.sourcePath)
          : await sourcePromise,
        mask:
          !layer.sourcePath && layer.maskPath
            ? await this.texture(layer.maskPath)
            : null,
        base: layer.base || color.paintBase || color,
      })),
    );
    const [base, , preparedLayers] = await Promise.all([
      basePromise,
      sourcePromise,
      layersPromise,
    ]);
    return { base, preparedLayers, color, width };
  }

  async processQueue() {
    if (this.isRendering) return;
    this.isRendering = true;

    while (this.queue.length) {
      const job = this.queue.shift();
      try {
        job.resolve(await this.draw(await job.prepared));
      } catch (error) {
        job.reject(error);
      }
    }

    this.isRendering = false;
  }

  draw({ base, preparedLayers, color, width }) {
    const gl = this.gl;
    const scale = Math.min(window.devicePixelRatio || 1, MAX_RENDER_WIDTH / Math.max(1, width));
    const renderWidth = Math.max(1, Math.round(width * scale));
    const renderHeight = Math.max(
      1,
      Math.round(renderWidth * (base.height / base.width)),
    );
    this.canvas.width = renderWidth;
    this.canvas.height = renderHeight;
    gl.viewport(0, 0, renderWidth, renderHeight);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    gl.useProgram(this.copyProgram);
    this.bind(this.copyProgram, base, renderWidth, renderHeight);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, base.texture);
    gl.uniform1i(gl.getUniformLocation(this.copyProgram, "u_texture"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.enable(gl.BLEND);
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(this.layerProgram);
    for (const layer of preparedLayers) {
      if (!layer.texture) continue;
      const paintBase = layer.base || {};
      this.bind(this.layerProgram, layer.texture, renderWidth, renderHeight);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, layer.texture.texture);
      gl.uniform1i(gl.getUniformLocation(this.layerProgram, "u_texture"), 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, layer.mask?.texture || layer.texture.texture);
      gl.uniform1i(gl.getUniformLocation(this.layerProgram, "u_mask"), 1);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_hasMask"), layer.mask ? 1 : 0);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_targetH"), color.h || 0);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_targetS"), (color.s ?? 100) / 100);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_targetV"), (color.v ?? 100) / 100);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_baseH"), paintBase.h || 0);
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_baseS"), clamp((paintBase.s ?? 100) / 100, 0.001, 1));
      gl.uniform1f(gl.getUniformLocation(this.layerProgram, "u_baseV"), clamp((paintBase.v ?? 100) / 100, 0.001, 1));
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }
    gl.disable(gl.BLEND);
    return typeof this.canvas.transferToImageBitmap === "function"
      ? this.canvas.transferToImageBitmap()
      : createImageBitmap(this.canvas);
  }
}

let service;

export function renderCartoonFrame(request) {
  if (!service) service = new VisualRenderService();
  return service.render(request);
}
