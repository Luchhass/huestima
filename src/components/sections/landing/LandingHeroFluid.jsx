"use client";

import { useEffect, useRef } from "react";

const VERTEX_SHADER = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPosition;
out vec2 vUv;
out vec2 vL;
out vec2 vR;
out vec2 vT;
out vec2 vB;
uniform vec2 texelSize;
void main () {
  vUv = aPosition * 0.5 + 0.5;
  vL = vUv - vec2(texelSize.x, 0.0);
  vR = vUv + vec2(texelSize.x, 0.0);
  vT = vUv + vec2(0.0, texelSize.y);
  vB = vUv - vec2(0.0, texelSize.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT_SHADERS = {
  advection: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D velocity;
    uniform sampler2D source;
    uniform vec2 texelSize;
    uniform float dt;
    uniform float dissipation;
    void main () {
      vec2 coord = vUv - dt * texture(velocity, vUv).xy * texelSize;
      outColor = dissipation * texture(source, coord);
    }`,
  clear: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D source;
    uniform float value;
    void main () { outColor = value * texture(source, vUv); }`,
  splat: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D target;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      vec3 addition = exp(-dot(p, p) / radius) * color;
      outColor = texture(target, vUv) + vec4(addition, 0.0);
    }`,
  dyeSplat: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D target;
    uniform float aspectRatio;
    uniform vec3 color;
    uniform vec2 point;
    uniform float radius;
    void main () {
      vec2 p = vUv - point;
      p.x *= aspectRatio;
      float influence = exp(-dot(p, p) / radius) * 0.42;
      vec4 current = texture(target, vUv);
      outColor = vec4(mix(current.rgb, color, influence), current.a);
    }`,
  divergence: `#version 300 es
    precision highp float;
    in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
    out vec4 outColor;
    uniform sampler2D velocity;
    void main () {
      float L = texture(velocity, vL).x;
      float R = texture(velocity, vR).x;
      float T = texture(velocity, vT).y;
      float B = texture(velocity, vB).y;
      vec2 C = texture(velocity, vUv).xy;
      if (vL.x < 0.0) L = -C.x;
      if (vR.x > 1.0) R = -C.x;
      if (vT.y > 1.0) T = -C.y;
      if (vB.y < 0.0) B = -C.y;
      outColor = vec4(0.5 * (R - L + T - B), 0.0, 0.0, 1.0);
    }`,
  curl: `#version 300 es
    precision highp float;
    in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
    out vec4 outColor;
    uniform sampler2D velocity;
    void main () {
      float L = texture(velocity, vL).y;
      float R = texture(velocity, vR).y;
      float T = texture(velocity, vT).x;
      float B = texture(velocity, vB).x;
      outColor = vec4(0.5 * (R - L - T + B), 0.0, 0.0, 1.0);
    }`,
  vorticity: `#version 300 es
    precision highp float;
    in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
    out vec4 outColor;
    uniform sampler2D velocity;
    uniform sampler2D curl;
    uniform float curlStrength;
    uniform float dt;
    void main () {
      float L = abs(texture(curl, vL).x);
      float R = abs(texture(curl, vR).x);
      float T = abs(texture(curl, vT).x);
      float B = abs(texture(curl, vB).x);
      float C = texture(curl, vUv).x;
      vec2 force = 0.5 * vec2(T - B, R - L);
      force /= length(force) + 0.0001;
      force *= curlStrength * C;
      force.y *= -1.0;
      vec2 result = texture(velocity, vUv).xy + force * dt;
      outColor = vec4(clamp(result, -1000.0, 1000.0), 0.0, 1.0);
    }`,
  pressure: `#version 300 es
    precision highp float;
    in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
    out vec4 outColor;
    uniform sampler2D pressure;
    uniform sampler2D divergence;
    void main () {
      float L = texture(pressure, vL).x;
      float R = texture(pressure, vR).x;
      float T = texture(pressure, vT).x;
      float B = texture(pressure, vB).x;
      float D = texture(divergence, vUv).x;
      outColor = vec4((L + R + B + T - D) * 0.25, 0.0, 0.0, 1.0);
    }`,
  gradient: `#version 300 es
    precision highp float;
    in vec2 vUv; in vec2 vL; in vec2 vR; in vec2 vT; in vec2 vB;
    out vec4 outColor;
    uniform sampler2D pressure;
    uniform sampler2D velocity;
    void main () {
      float L = texture(pressure, vL).x;
      float R = texture(pressure, vR).x;
      float T = texture(pressure, vT).x;
      float B = texture(pressure, vB).x;
      vec2 result = texture(velocity, vUv).xy - vec2(R - L, T - B);
      outColor = vec4(result, 0.0, 1.0);
    }`,
  display: `#version 300 es
    precision highp float;
    in vec2 vUv;
    out vec4 outColor;
    uniform sampler2D dye;
    void main () {
      vec3 raw = max(texture(dye, vUv).rgb, 0.0);
      vec3 color = 1.0 - exp(-raw * 1.55);
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = clamp(mix(vec3(luminance), color, 1.14), 0.0, 1.0);
      float alpha = clamp(max(max(color.r, color.g), color.b) * 0.96, 0.0, 0.94);
      outColor = vec4(color, alpha);
    }`,
};

const HUESTIMA_PASTEL_RGB = [
  [1, 0.373, 0.478],
  [0.969, 0.816, 0.275],
  [0.196, 0.851, 0.537],
  [0.271, 0.651, 1],
  [0.616, 0.424, 1],
];

function pastelRgbAt(phase) {
  const scaled = phase * HUESTIMA_PASTEL_RGB.length;
  const index = Math.floor(scaled) % HUESTIMA_PASTEL_RGB.length;
  const nextIndex = (index + 1) % HUESTIMA_PASTEL_RGB.length;
  const mix = scaled - Math.floor(scaled);
  return HUESTIMA_PASTEL_RGB[index].map(
    (channel, channelIndex) =>
      channel + (HUESTIMA_PASTEL_RGB[nextIndex][channelIndex] - channel) * mix,
  );
}

function createCanvasFallback(canvas, surface) {
  const context = canvas.getContext("2d");
  if (!context) return () => {};
  const particles = [];
  let frame = 0;

  const resize = () => {
    const rect = surface.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 1.25);
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
  };
  const draw = () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life -= 0.012;
      particle.radius += 1.15;
      if (particle.life <= 0) {
        particles.splice(index, 1);
        continue;
      }
      const gradient = context.createRadialGradient(
        particle.x,
        particle.y,
        0,
        particle.x,
        particle.y,
        particle.radius,
      );
      const [red, green, blue] = particle.color.map((channel) => Math.round(channel * 255));
      gradient.addColorStop(0, `rgba(${red}, ${green}, ${blue}, ${particle.life * 0.75})`);
      gradient.addColorStop(0.48, `rgba(${red}, ${green}, ${blue}, ${particle.life * 0.36})`);
      gradient.addColorStop(1, "transparent");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fill();
    }
    frame = particles.length ? requestAnimationFrame(draw) : 0;
  };
  const move = (event) => {
    const rect = surface.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom
    ) return;
    const ratio = canvas.width / rect.width;
    particles.push({
      x: (event.clientX - rect.left) * ratio,
      y: (event.clientY - rect.top) * ratio,
      radius: 18 * ratio,
      color: pastelRgbAt(
        (performance.now() * 0.000055 + event.clientX / rect.width * 0.48) % 1,
      ),
      life: 1,
    });
    if (particles.length > 70) particles.shift();
    if (!frame) frame = requestAnimationFrame(draw);
  };
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  window.addEventListener("pointermove", move, { passive: true });
  return () => {
    observer.disconnect();
    window.removeEventListener("pointermove", move);
    if (frame) cancelAnimationFrame(frame);
  };
}

function createFluid(canvas, surface) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    powerPreference: "high-performance",
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    stencil: false,
  });
  if (!gl || !gl.getExtension("EXT_color_buffer_float")) {
    return createCanvasFallback(canvas, surface);
  }

  const linear = Boolean(gl.getExtension("OES_texture_float_linear"));
  const programs = {};
  const resources = {
    buffers: [],
    framebuffers: [],
    programs: [],
    shaders: [],
    textures: [],
    vertexArrays: [],
  };
  const queue = [];
  let velocity;
  let dye;
  let divergence;
  let curl;
  let pressure;
  let animationFrame = 0;
  let visible = true;
  let lastPoint = null;
  let lastFrameTime = performance.now();
  let lastInputTime = 0;

  const compileShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "Fluid shader compilation failed");
    }
    resources.shaders.push(shader);
    return shader;
  };

  const createProgram = (fragmentSource) => {
    const program = gl.createProgram();
    gl.attachShader(program, compileShader(gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "Fluid shader linking failed");
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let index = 0; index < count; index += 1) {
      const name = gl.getActiveUniform(program, index).name;
      uniforms[name] = gl.getUniformLocation(program, name);
    }
    resources.programs.push(program);
    return { program, uniforms };
  };

  Object.entries(FRAGMENT_SHADERS).forEach(([name, shader]) => {
    programs[name] = createProgram(shader);
  });

  const vao = gl.createVertexArray();
  const buffer = gl.createBuffer();
  resources.vertexArrays.push(vao);
  resources.buffers.push(buffer);
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const createTarget = (width, height, internalFormat, format, filter = gl.NEAREST) => {
    const texture = gl.createTexture();
    const framebuffer = gl.createFramebuffer();
    resources.textures.push(texture);
    resources.framebuffers.push(framebuffer);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, width, height, 0, format, gl.HALF_FLOAT, null);
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("The device cannot render the requested floating-point fluid target.");
    }
    return { texture, framebuffer, width, height };
  };

  const createDoubleTarget = (...args) => {
    const target = { read: createTarget(...args), write: createTarget(...args) };
    target.swap = () => {
      const current = target.read;
      target.read = target.write;
      target.write = current;
    };
    return target;
  };

  const resolution = (base) => {
    const aspect = canvas.width / canvas.height;
    return aspect >= 1
      ? [Math.round(base * aspect), base]
      : [base, Math.round(base / aspect)];
  };

  const initializeTargets = () => {
    const mobile = window.matchMedia("(max-width: 767px)").matches;
    const [simWidth, simHeight] = resolution(mobile ? 96 : 144);
    const [dyeWidth, dyeHeight] = resolution(mobile ? 384 : 640);
    const filter = linear ? gl.LINEAR : gl.NEAREST;
    velocity = createDoubleTarget(simWidth, simHeight, gl.RG16F, gl.RG, filter);
    dye = createDoubleTarget(dyeWidth, dyeHeight, gl.RGBA16F, gl.RGBA, filter);
    divergence = createTarget(simWidth, simHeight, gl.R16F, gl.RED);
    curl = createTarget(simWidth, simHeight, gl.R16F, gl.RED);
    pressure = createDoubleTarget(simWidth, simHeight, gl.R16F, gl.RED);
  };

  const resize = () => {
    const rect = surface.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1.1 : 1.35);
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    if (velocity && dye && canvas.width === width && canvas.height === height) return;
    canvas.width = width;
    canvas.height = height;
    initializeTargets();
  };

  const bindProgram = (entry, width, height) => {
    gl.useProgram(entry.program);
    if (entry.uniforms.texelSize) gl.uniform2f(entry.uniforms.texelSize, 1 / width, 1 / height);
  };
  const bindTexture = (entry, name, texture, unit) => {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(entry.uniforms[name], unit);
  };
  const drawTo = (target) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer || null);
    gl.viewport(0, 0, target?.width || canvas.width, target?.height || canvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  };

  const applySplat = ({ x, y, dx, dy, color }) => {
    const entry = programs.splat;
    bindProgram(entry, velocity.read.width, velocity.read.height);
    bindTexture(entry, "target", velocity.read.texture, 0);
    gl.uniform1f(entry.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(entry.uniforms.point, x, y);
    gl.uniform3f(entry.uniforms.color, dx, dy, 0);
    gl.uniform1f(entry.uniforms.radius, 0.00075);
    drawTo(velocity.write);
    velocity.swap();

    const dyeEntry = programs.dyeSplat;
    bindProgram(dyeEntry, dye.read.width, dye.read.height);
    bindTexture(dyeEntry, "target", dye.read.texture, 0);
    gl.uniform1f(dyeEntry.uniforms.aspectRatio, canvas.width / canvas.height);
    gl.uniform2f(dyeEntry.uniforms.point, x, y);
    gl.uniform3f(dyeEntry.uniforms.color, color[0], color[1], color[2]);
    gl.uniform1f(dyeEntry.uniforms.radius, 0.0014);
    drawTo(dye.write);
    dye.swap();
  };

  const step = (dt) => {
    const advect = programs.advection;
    bindProgram(advect, velocity.read.width, velocity.read.height);
    bindTexture(advect, "velocity", velocity.read.texture, 0);
    bindTexture(advect, "source", velocity.read.texture, 1);
    gl.uniform1f(advect.uniforms.dt, dt);
    gl.uniform1f(advect.uniforms.dissipation, Math.pow(0.992, dt * 60));
    drawTo(velocity.write);
    velocity.swap();

    bindProgram(programs.curl, velocity.read.width, velocity.read.height);
    bindTexture(programs.curl, "velocity", velocity.read.texture, 0);
    drawTo(curl);

    bindProgram(programs.vorticity, velocity.read.width, velocity.read.height);
    bindTexture(programs.vorticity, "velocity", velocity.read.texture, 0);
    bindTexture(programs.vorticity, "curl", curl.texture, 1);
    gl.uniform1f(programs.vorticity.uniforms.curlStrength, 24);
    gl.uniform1f(programs.vorticity.uniforms.dt, dt);
    drawTo(velocity.write);
    velocity.swap();

    bindProgram(programs.divergence, velocity.read.width, velocity.read.height);
    bindTexture(programs.divergence, "velocity", velocity.read.texture, 0);
    drawTo(divergence);

    bindProgram(programs.clear, pressure.read.width, pressure.read.height);
    bindTexture(programs.clear, "source", pressure.read.texture, 0);
    gl.uniform1f(programs.clear.uniforms.value, 0.8);
    drawTo(pressure.write);
    pressure.swap();

    bindProgram(programs.pressure, pressure.read.width, pressure.read.height);
    bindTexture(programs.pressure, "divergence", divergence.texture, 1);
    for (let iteration = 0; iteration < 10; iteration += 1) {
      bindTexture(programs.pressure, "pressure", pressure.read.texture, 0);
      drawTo(pressure.write);
      pressure.swap();
    }

    bindProgram(programs.gradient, velocity.read.width, velocity.read.height);
    bindTexture(programs.gradient, "pressure", pressure.read.texture, 0);
    bindTexture(programs.gradient, "velocity", velocity.read.texture, 1);
    drawTo(velocity.write);
    velocity.swap();

    bindProgram(advect, dye.read.width, dye.read.height);
    gl.uniform2f(
      advect.uniforms.texelSize,
      1 / velocity.read.width,
      1 / velocity.read.height,
    );
    bindTexture(advect, "velocity", velocity.read.texture, 0);
    bindTexture(advect, "source", dye.read.texture, 1);
    gl.uniform1f(advect.uniforms.dt, dt);
    gl.uniform1f(advect.uniforms.dissipation, Math.pow(0.986, dt * 60));
    drawTo(dye.write);
    dye.swap();
  };

  const display = () => {
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    bindProgram(programs.display, canvas.width, canvas.height);
    bindTexture(programs.display, "dye", dye.read.texture, 0);
    drawTo(null);
    gl.disable(gl.BLEND);
  };

  const render = (time) => {
    animationFrame = 0;
    if (!visible) return;
    const dt = Math.min(Math.max((time - lastFrameTime) / 1000, 0.001), 0.033);
    lastFrameTime = time;
    queue.splice(0, 18).forEach(applySplat);
    step(dt);
    display();
    if (queue.length || time - lastInputTime < 6200) {
      animationFrame = requestAnimationFrame(render);
    }
  };

  const start = () => {
    lastInputTime = performance.now();
    if (!animationFrame && visible) {
      lastFrameTime = performance.now();
      animationFrame = requestAnimationFrame(render);
    }
  };

  const pointerMove = (event) => {
    if (event.pointerType === "touch" && event.buttons === 0 && !event.isPrimary) return;
    const rect = surface.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom
    ) {
      lastPoint = null;
      return;
    }
    const coalescedEvents = event.getCoalescedEvents?.();
    const events = coalescedEvents?.length ? coalescedEvents : [event];
    events.forEach((pointEvent) => {
      const point = {
        x: (pointEvent.clientX - rect.left) / rect.width,
        y: 1 - (pointEvent.clientY - rect.top) / rect.height,
      };
      if (point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) return;
      const previous = lastPoint || point;
      const pixelDistance = Math.hypot(
        (point.x - previous.x) * rect.width,
        (point.y - previous.y) * rect.height,
      );
      const count = Math.min(8, Math.max(1, Math.ceil(pixelDistance / 18)));
      for (let index = 1; index <= count; index += 1) {
        const progress = index / count;
        const x = previous.x + (point.x - previous.x) * progress;
        const y = previous.y + (point.y - previous.y) * progress;
        queue.push({
          x,
          y,
          dx: Math.max(-900, Math.min(900, (point.x - previous.x) * rect.width * 18)),
          dy: Math.max(-900, Math.min(900, (point.y - previous.y) * rect.height * 18)),
          color: pastelRgbAt(
            (performance.now() * 0.000055 + x * 0.48 + y * 0.22) % 1,
          ),
        });
      }
      lastPoint = point;
    });
    start();
  };

  const pointerEnd = () => { lastPoint = null; };
  const resizeObserver = new ResizeObserver(resize);
  const intersectionObserver = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else if (visible && performance.now() - lastInputTime < 6200) {
      start();
    }
  }, { threshold: 0.01 });

  resize();
  resizeObserver.observe(surface);
  intersectionObserver.observe(surface);
  surface.addEventListener("pointerdown", pointerMove, { passive: true });
  window.addEventListener("pointermove", pointerMove, { passive: true });
  window.addEventListener("pointerup", pointerEnd, { passive: true });
  window.addEventListener("pointercancel", pointerEnd, { passive: true });
  return () => {
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    surface.removeEventListener("pointerdown", pointerMove);
    window.removeEventListener("pointermove", pointerMove);
    window.removeEventListener("pointerup", pointerEnd);
    window.removeEventListener("pointercancel", pointerEnd);
    if (animationFrame) cancelAnimationFrame(animationFrame);
    resources.programs.forEach((resource) => gl.deleteProgram(resource));
    resources.shaders.forEach((resource) => gl.deleteShader(resource));
    resources.textures.forEach((resource) => gl.deleteTexture(resource));
    resources.framebuffers.forEach((resource) => gl.deleteFramebuffer(resource));
    resources.buffers.forEach((resource) => gl.deleteBuffer(resource));
    resources.vertexArrays.forEach((resource) => gl.deleteVertexArray(resource));
  };
}

export default function LandingHeroFluid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const surface = canvas?.closest(".landing-page__hero");
    if (!canvas || !surface) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    try {
      return createFluid(canvas, surface);
    } catch (error) {
      console.warn("WebGL fluid effect fell back to Canvas 2D.", error);
      return createCanvasFallback(canvas, surface);
    }
  }, []);

  return <canvas ref={canvasRef} className="landing-hero-fluid" aria-hidden="true" />;
}
