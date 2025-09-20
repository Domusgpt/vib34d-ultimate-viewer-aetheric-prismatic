
// PRISMATIC System (chromatic dispersion SDF glass)
// Drop-in module for vib34d-ultimate-viewer
// Exports a factory with { id, name, init(gl), draw(gl, state, dt), resize(gl, w, h), dispose(gl) }

import { compileProgram } from '../_shared/glutils.js';
import vertSrc from '../../shaders/prismatic.vert.glsl';
import fragSrc from '../../shaders/prismatic.frag.glsl';

export default function createPrismaticSystem(gl) {
  const id = 'PRISMATIC';
  const name = 'Prismatic (Spectral Glass)';
  let program, vao, uniforms = {};

  function init(gl) {
    program = compileProgram(gl, vertSrc, fragSrc);

    const vbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    vao = gl.createVertexArray();
    gl.bindVertexArray(vao);

    const posLoc = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const u = n => gl.getUniformLocation(program, n);
    uniforms = {
      u_time:      u('u_time'),
      u_res:       u('u_res'),
      u_rotXW:     u('u_rotXW'),
      u_rotYW:     u('u_rotYW'),
      u_rotZW:     u('u_rotZW'),
      u_grid:      u('u_grid'),
      u_morph:     u('u_morph'),
      u_chaos:     u('u_chaos'),
      u_speed:     u('u_speed'),
      u_hue:       u('u_hue'),
      u_intensity: u('u_intensity'),
      u_sat:       u('u_sat'),
    };
  }

  function resize(gl, width, height) {
    gl.viewport(0, 0, width, height);
  }

  function draw(gl, state, dt) {
    const { width, height } = gl.canvas;
    const p = state.params;

    gl.useProgram(program);
    gl.bindVertexArray(vao);

    gl.uniform1f(uniforms.u_time, state.time);
    gl.uniform2f(uniforms.u_res, width, height);
    gl.uniform1f(uniforms.u_rotXW,     p.rotXW || 0.0);
    gl.uniform1f(uniforms.u_rotYW,     p.rotYW || 0.0);
    gl.uniform1f(uniforms.u_rotZW,     p.rotZW || 0.0);
    gl.uniform1f(uniforms.u_grid,      (p.gridDensity ?? 10.0));
    gl.uniform1f(uniforms.u_morph,     (p.morphFactor ?? 0.5));
    gl.uniform1f(uniforms.u_chaos,     (p.chaos ?? 0.1));
    gl.uniform1f(uniforms.u_speed,     (p.speed ?? 1.0));
    gl.uniform1f(uniforms.u_hue,       (p.hue ?? 200.0));
    gl.uniform1f(uniforms.u_intensity, (p.intensity ?? 0.5));
    gl.uniform1f(uniforms.u_sat,       (p.saturation ?? 1.0));

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function dispose(gl) {
    if (vao) gl.deleteVertexArray(vao);
    // Program/buffers are auto-GC’d by page; no need to delete program
  }
  
  init(gl);

  return { id, name, init, draw, resize, dispose };
}
