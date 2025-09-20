#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_res;
uniform float u_time;

// VIB34D grammar (mapped from state.params)
uniform float u_rotXW;
uniform float u_rotYW;
uniform float u_rotZW;
uniform float u_grid;      // “Grid Density”
uniform float u_morph;     // “Morph Factor”
uniform float u_chaos;     // “Chaos”
uniform float u_speed;
uniform float u_hue;       // “Hue”               [0..360]
uniform float u_intensity; // “Intensity”         [0..1]
uniform float u_sat;       // “Saturation”      [0..1]
uniform float u_scale;     // “Scale”             [0.1..5]

const float PI = 3.14159265359;

float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 234.12));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

vec3 hsl2rgb(float h, float s, float l) {
    float c = (1.0 - abs(2.0*l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h/60.0, 2.0) - 1.0));
    float m = l - 0.5*c;
    vec3 rgb = (h < 60.0) ? vec3(c,x,0) :
               (h < 120.0) ? vec3(x,c,0) :
               (h < 180.0) ? vec3(0,c,x) :
               (h < 240.0) ? vec3(0,x,c) :
               (h < 300.0) ? vec3(x,0,c) :
               vec3(c,0,x);
    return rgb + m;
}

mat3 basisFrom4DRot(float rxw, float ryw, float rzw) {
    float cx = cos(rxw), sx = sin(rxw);
    float cy = cos(ryw), sy = sin(ryw);
    float cz = cos(rzw), sz = sin(rzw);
    // we collapse W using three independent rotations into a 3x3 mixing basis
    return mat3(
        cx,  -sx*cz,  sx*sz,
        sy,   cy*cz, -cy*sz,
        sz,   cz,    0.0
    );
}

// Tri-planar grid interference “shadow” of higher-D structure
float sdfShadow(vec2 p, mat3 basis) {
    vec3 q = basis * vec3(p, 0.0);
    float g = u_grid * 0.5;
    vec2 w1 = vec2(sin(q.x*g), cos(q.y*g*0.91));
    vec2 w2 = vec2(sin(q.y*g*1.732), cos(q.z*g*1.618));
    float field = dot(w1,w2);
    return field; // not a true SDF, but behaves like one for this effect
}

// Multi-octave interference (caustic feel)
float aether(vec2 p, float t) {
    float f = 0.0;
    float a = 0.6;
    float freq = 2.0 * u_scale;
    for (int i=0; i<3; i++) {
        vec2 q = p*freq;
        float phase = t * 0.4 * u_speed * (float(i)+1.0);
        float s = sin(q.x+phase) * cos(q.y - 0.5*phase);
        float n = hash21(q + phase) * 2.0 - 1.0;
        f += a * s * (1.0 + u_chaos * n);
        a *= 0.6;
        freq *= 2.1;
    }
    return f;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_res.xy);
    vec2 p = (uv - 0.5) * vec2(u_res.x/u_res.y, 1.0);

    mat3 B = basisFrom4DRot(u_rotXW, u_rotYW, u_rotZW);

    float shadow = sdfShadow(p, B);
    float wave   = aether(p, u_time);

    // combine: bright seams where density field is zero, colored by wave interference
    float lum = pow(max(0.0, 1.0 - abs(shadow)), 8.0) * u_intensity;
    lum += pow(max(0.0, wave), 2.0) * 0.2 * u_intensity;

    // subtle chroma shift from 4D “parallax”
    float par = dot(B[0], B[1]);
    float hue = mod(u_hue + 90.0*par + 360.0, 360.0);

    vec3 col = hsl2rgb(hue, clamp(u_sat, 0.0, 1.0), 0.5) * lum;

    // card-glass pop (soft vignette + rim light)
    float r = length(uv - 0.5);
    float vign = smoothstep(0.85, 0.35, r);
    float rim  = smoothstep(0.48, 0.5, r) * 0.25;
    col *= vign;
    col += rim * vec3(1.0);

    fragColor = vec4(col, 1.0);
}
