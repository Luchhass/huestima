"use client";

import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { loadCartoonImage } from "@/lib/cartoonImageCache";

const MAX_RENDER_WIDTH = 1400;
const POSITIONS = new Float32Array([
  -1, -1,
  1, -1,
  -1, 1,
  -1, 1,
  1, -1,
  1, 1,
]);

const BASE_VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

const COPY_FRAGMENT_SHADER = `
  precision highp float;
  uniform sampler2D u_texture;
  varying vec2 v_texCoord;

  void main() {
    gl_FragColor = texture2D(u_texture, v_texCoord);
  }
`;

const LAYER_FRAGMENT_SHADER = `
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

  float normalizeHue(float hue) {
    return mod(mod(hue, 360.0) + 360.0, 360.0);
  }

  float hueOffset(float hue, float baseHue) {
    return normalizeHue(hue - baseHue + 180.0) - 180.0;
  }

  vec3 rgbToHsv(vec3 color) {
    float cMax = max(max(color.r, color.g), color.b);
    float cMin = min(min(color.r, color.g), color.b);
    float delta = cMax - cMin;
    float hue = 0.0;

    if (delta > 0.00001) {
      if (cMax == color.r) {
        hue = 60.0 * mod((color.g - color.b) / delta, 6.0);
      } else if (cMax == color.g) {
        hue = 60.0 * (((color.b - color.r) / delta) + 2.0);
      } else {
        hue = 60.0 * (((color.r - color.g) / delta) + 4.0);
      }
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

    if (huePrime < 1.0) {
      rgb = vec3(chroma, x, 0.0);
    } else if (huePrime < 2.0) {
      rgb = vec3(x, chroma, 0.0);
    } else if (huePrime < 3.0) {
      rgb = vec3(0.0, chroma, x);
    } else if (huePrime < 4.0) {
      rgb = vec3(0.0, x, chroma);
    } else if (huePrime < 5.0) {
      rgb = vec3(x, 0.0, chroma);
    } else {
      rgb = vec3(chroma, 0.0, x);
    }

    return rgb + vec3(matchValue);
  }

  void main() {
    vec4 source = texture2D(u_texture, v_texCoord);
    float maskAlpha = mix(1.0, texture2D(u_mask, v_texCoord).a, u_hasMask);
    float alpha = source.a * maskAlpha;

    if (alpha <= 0.001) {
      discard;
    }

    vec3 hsv = rgbToHsv(source.rgb);
    vec3 shifted = hsvToRgb(vec3(
      u_targetH + hueOffset(hsv.x, u_baseH),
      hsv.y * (u_targetS / max(u_baseS, 0.001)),
      hsv.z * (u_targetV / max(u_baseV, 0.001))
    ));

    gl_FragColor = vec4(shifted, alpha);
  }
`;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "Failed to compile cartoon shader.");
  }

  return shader;
}

function createProgram(gl, fragmentShaderSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, BASE_VERTEX_SHADER);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
  const program = gl.createProgram();

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || "Failed to link cartoon shader.");
  }

  return program;
}

function createTexture(gl, image) {
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
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
  let u0 = 0;
  let u1 = 1;
  let v0 = 0;
  let v1 = 1;

  if (imageRatio > canvasRatio) {
    const visibleWidth = canvasRatio / imageRatio;
    u0 = (1 - visibleWidth) / 2;
    u1 = 1 - u0;
  } else if (imageRatio < canvasRatio) {
    const visibleHeight = imageRatio / canvasRatio;
    v0 = (1 - visibleHeight) / 2;
    v1 = 1 - v0;
  }

  return new Float32Array([
    u0, v0,
    u1, v0,
    u0, v1,
    u0, v1,
    u1, v0,
    u1, v1,
  ]);
}

function bindGeometry(gl, program, positionBuffer, texCoordBuffer, texCoords) {
  const positionLocation = gl.getAttribLocation(program, "a_position");
  const texCoordLocation = gl.getAttribLocation(program, "a_texCoord");

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.enableVertexAttribArray(positionLocation);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STREAM_DRAW);
  gl.enableVertexAttribArray(texCoordLocation);
  gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);
}

function layerKey(layers) {
  return layers
    .map(
      (layer) =>
        `${layer.id}:${layer.sourcePath}:${layer.maskPath}:${layer.base?.h}:${layer.base?.s}:${layer.base?.v}`,
    )
    .join("|");
}

function normalizeTarget(color) {
  return {
    h: Number.isFinite(color?.h) ? color.h : 0,
    s: Number.isFinite(color?.s) ? color.s / 100 : 1,
    v: Number.isFinite(color?.v) ? color.v / 100 : 1,
    paintBase: color?.paintBase,
  };
}

function normalizeBase(base, fallback) {
  const baseValue = base || fallback || {};

  return {
    h: Number.isFinite(baseValue.h) ? baseValue.h : fallback?.h || 0,
    s: (Number.isFinite(baseValue.s) ? baseValue.s : fallback?.s || 100) / 100,
    v: (Number.isFinite(baseValue.v) ? baseValue.v : fallback?.v || 100) / 100,
  };
}

export default function CartoonCanvas({
  baseSrc,
  sourceSrc,
  layers,
  color,
  className = "",
}) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const rendererRef = useRef(null);
  const visibleRef = useRef(false);
  const targetRef = useRef(normalizeTarget(color));
  const cleanLayers = useMemo(
    () =>
      Array.isArray(layers)
        ? layers.filter((layer) => layer?.sourcePath || layer?.maskPath)
        : [],
    [layers],
  );
  const cleanLayerKey = useMemo(() => layerKey(cleanLayers), [cleanLayers]);
  const targetH = Number.isFinite(color?.h) ? color.h : 0;
  const targetS = Number.isFinite(color?.s) ? color.s : 100;
  const targetV = Number.isFinite(color?.v) ? color.v : 100;
  const paintBase = color?.paintBase;
  const paintBaseKey = `${paintBase?.h ?? ""}:${paintBase?.s ?? ""}:${paintBase?.v ?? ""}`;

  useLayoutEffect(() => {
    targetRef.current = normalizeTarget(color);

    if (visibleRef.current && rendererRef.current) {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      rendererRef.current.draw();
    }
  }, [color, targetH, targetS, targetV, paintBaseKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !baseSrc || !cleanLayers.length) return undefined;
    if (!sourceSrc && cleanLayers.some((layer) => !layer.sourcePath)) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      preserveDrawingBuffer: false,
      premultipliedAlpha: false,
      stencil: false,
    });

    if (!gl) return undefined;

    let isCancelled = false;
    const copyProgram = createProgram(gl, COPY_FRAGMENT_SHADER);
    const layerProgram = createProgram(gl, LAYER_FRAGMENT_SHADER);
    const positionBuffer = gl.createBuffer();
    const texCoordBuffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, POSITIONS, gl.STATIC_DRAW);

    const renderer = {
      base: null,
      layers: [],
      draw: () => {},
    };
    rendererRef.current = renderer;

    function sizeCanvas() {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.min(
        window.devicePixelRatio || 1,
        MAX_RENDER_WIDTH / Math.max(1, rect.width),
      );
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      return { width, height };
    }

    function drawTexture(program, texture, textureUnit = 0) {
      const { width, height } = sizeCanvas();

      gl.useProgram(program);
      bindGeometry(
        gl,
        program,
        positionBuffer,
        texCoordBuffer,
        coverTexCoords(texture, width, height),
      );
      gl.activeTexture(gl.TEXTURE0 + textureUnit);
      gl.bindTexture(gl.TEXTURE_2D, texture.texture);
      gl.uniform1i(gl.getUniformLocation(program, "u_texture"), textureUnit);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    renderer.draw = () => {
      if (!visibleRef.current || !renderer.base) return;

      const { width, height } = sizeCanvas();
      gl.viewport(0, 0, width, height);
      gl.disable(gl.BLEND);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      drawTexture(copyProgram, renderer.base, 0);

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(layerProgram);

      const target = targetRef.current;
      renderer.layers.forEach((layer) => {
        const base = normalizeBase(layer.base, target.paintBase);

        bindGeometry(
          gl,
          layerProgram,
          positionBuffer,
          texCoordBuffer,
          coverTexCoords(layer.texture, width, height),
        );
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, layer.texture.texture);
        gl.uniform1i(gl.getUniformLocation(layerProgram, "u_texture"), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, layer.mask?.texture || layer.texture.texture);
        gl.uniform1i(gl.getUniformLocation(layerProgram, "u_mask"), 1);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_hasMask"), layer.mask ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_targetH"), target.h);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_targetS"), target.s);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_targetV"), target.v);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_baseH"), base.h);
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_baseS"), clamp(base.s, 0.001, 1));
        gl.uniform1f(gl.getUniformLocation(layerProgram, "u_baseV"), clamp(base.v, 0.001, 1));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      });

      gl.disable(gl.BLEND);
    };

    function requestDraw() {
      if (!visibleRef.current) return;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      frameRef.current = requestAnimationFrame(() => renderer.draw());
    }

    async function loadTextures() {
      const baseImage = await loadCartoonImage(baseSrc);
      const sourceImage = sourceSrc ? await loadCartoonImage(sourceSrc) : null;

      if (isCancelled || !baseImage) return;

      renderer.base = createTexture(gl, baseImage);
      renderer.layers = await Promise.all(
        cleanLayers.map(async (layer) => {
          const layerImage = layer.sourcePath
            ? await loadCartoonImage(layer.sourcePath)
            : sourceImage;
          const needsMask = !layer.sourcePath && layer.maskPath;
          const maskImage = needsMask ? await loadCartoonImage(layer.maskPath) : null;

          if (!layerImage) return null;

          return {
            texture: createTexture(gl, layerImage),
            mask: maskImage ? createTexture(gl, maskImage) : null,
            base: layer.base,
          };
        }),
      ).then((loadedLayers) => loadedLayers.filter(Boolean));

      if (!isCancelled) requestDraw();
    }

    const resizeObserver = new ResizeObserver(requestDraw);
    resizeObserver.observe(canvas);

    let intersectionObserver = null;
    if ("IntersectionObserver" in window) {
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry.isIntersecting;
          if (visibleRef.current) requestDraw();
        },
        { rootMargin: "160px" },
      );
      intersectionObserver.observe(canvas);
    } else {
      visibleRef.current = true;
    }

    loadTextures().catch((error) => {
      console.warn("Cartoon renderer failed.", error);
    });

    return () => {
      isCancelled = true;
      rendererRef.current = null;
      resizeObserver.disconnect();
      intersectionObserver?.disconnect();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      [...renderer.layers.map((layer) => layer.texture), renderer.base]
        .filter(Boolean)
        .forEach((texture) => gl.deleteTexture(texture.texture));
      renderer.layers
        .map((layer) => layer.mask)
        .filter(Boolean)
        .forEach((texture) => gl.deleteTexture(texture.texture));
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(texCoordBuffer);
      gl.deleteProgram(copyProgram);
      gl.deleteProgram(layerProgram);
    };
  }, [baseSrc, sourceSrc, cleanLayers, cleanLayerKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full ${className}`}
    />
  );
}
