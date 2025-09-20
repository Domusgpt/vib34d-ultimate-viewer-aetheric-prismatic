#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 u_res;
uniform float u_time;

// Shared VIB34D parameter grammar
uniform float u_rotXW;
uniform float u_rotYW;
uniform float u_rotZW;
uniform float u_grid;      // Grid Density   (not used directly, but available)
uniform float u_morph;     // Morph Factor   (0..1)
uniform float u_chaos;     // Chaos          (0..1)
uniform float u_speed;     // Speed          (0..5)
uniform float u_intensity; // Intensity      (0..1)
uniform float u_hue;       // Hue            (0..360)
uniform float u_sat;       // Saturation (0..1)

// -------- math helpers --------
float sdBox(vec3 p, vec3 b){ vec3 d = abs(p) - b; return length(max(d,0.0)) + min(max(d.x,max(d.y,d.z)),0.0); }

// Hexagonal prism: radius r, height h
float sdHexPrism(vec3 p, vec2 h) {
    const vec3 k = vec3(-0.8660254, 0.5, 0.57735026);
    p = abs(p);
    p.xy -= 2.0*min(dot(k.xy, p.xy), 0.0)*k.xy;
    vec2 d = vec2(length(p.xy-vec2(clamp(p.x,-k.z*h.x,k.z*h.x), h.x))*sign(p.y-h.x), p.z-h.y);
    return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

// Very cheap tetrahedron
float sdTetra(vec3 p) {
    const vec3 n1 = normalize(vec3(1,1,1));
    const vec3 n2 = normalize(vec3(-1,-1,1));
    const vec3 n3 = normalize(vec3(1,-1,-1));
    const vec3 n4 = normalize(vec3(-1,1,-1));
    float d = max(max(dot(p,n1), dot(p,n2)), max(dot(p,n3), dot(p,n4)));
    return d - 0.5; // size = 0.5
}

mat3 basisFrom4DRot(float rxw, float ryw, float rzw) {
    float cx = cos(rxw), sx = sin(rxw);
    float cy = cos(ryw), sy = sin(ryw);
    float cz = cos(rzw), sz = sin(rzw);
    return mat3(cx, -sx*cz, sx*sz,  sy, cy*cz, -cy*sz,  sz, cz, 0.0);
}

float hash11(float x){ return fract(sin(x*727.1)*435.5); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(41.2, 289.4)))*43758.5453); }

vec3 rep(vec3 p, float cell) {
    return fract(p/cell+0.5)*cell - 0.5*cell;
}

// Scene SDF: morph between tetra and hex prism
float map(vec3 p, float t) {
    float cell = mix(2.0, 0.75, clamp(u_grid/20.0, 0.0, 1.0));
    vec3 q = rep(p, cell);
    q = basisFrom4DRot(t*0.1, t*0.13, t*0.15) * q;

    // Base size animated by time
    float s = 0.55 + 0.15*sin(t*u_speed*0.5);
    float dT = sdTetra(q) * s;
    float dH = sdHexPrism(q, vec2(s*0.8, s*1.2));

    float k = smoothstep(0.0, 1.0, u_morph);
    float d = mix(dT, dH, k);

    // Micro-surface noise as distortion
    float n = (hash21(q.xy*3.3 + t*0.3) - 0.5) * (0.015 + 0.04*u_chaos); d += n;

    return d;
}

vec3 getNormal(vec3 p, float t) {
    const vec2 e = vec2(1e-3, 0.0);
    float d = map(p, t);
    return normalize(vec3(
        d - map(p-vec3(e.x, e.y, e.y), t),
        d - map(p-vec3(e.y, e.x, e.y), t),
        d - map(p-vec3(e.y, e.y, e.x), t)
    ));
}

// Environment color (analytic)
vec3 envColor(vec3 rd) {
    float v = 0.5 + 0.5*rd.y;                  // sky-to-ground gradient
    float h = mod(u_hue + rd.x * 20.0, 360.0); // add some variation
    float s = u_sat * 0.8;
    float l = 0.3 + v * 0.3;

    float c = (1.0 - abs(2.0*l - 1.0)) * s;
    float x = c * (1.0 - abs(mod(h/60.0, 2.0) - 1.0));
    float m = l - 0.5*c;
    vec3 rgb = (h<60.0)?vec3(c,x,0):(h<120.0)?vec3(x,c,0):(h<180.0)?vec3(0,c,x):(h<240.0)?vec3(0,x,c):(h<300.0)?vec3(x,0,c):vec3(c,0,x);
    return rgb + m;
}

// Simple camera
void camera(in vec2 uv, out vec3 ro, out vec3 rd, in mat3 basis) {
    ro = vec3(0.0, 0.0, 2.5);
    float fov = 1.5;
    vec3 fw = normalize(vec3(0.0, 0.0, -1.0));
    vec3 rt = normalize(vec3(1.0, 0.0, 0.0));
    vec3 up = normalize(cross(fw, rt));
    vec3 dir = normalize(uv.x*rt + uv.y*up + fov*fw);
    // 4D-inspired warping of ray basis
    rd = normalize(basis * dir);
}

float raymarch(vec3 ro, vec3 rd, float t, out vec3 pHit){
    float tacc = 0.0;
    const int STEPS = 64;
    const float TMAX = 5.0;
    for (int i=0; i<STEPS; i++){
        vec3 p = ro + rd*tacc;
        float d = map(p, t);
        if (d<0.001){ pHit = p; return tacc; }
        tacc += d * 0.7;
        if (tacc > TMAX) break;
    }
    pHit = ro + rd*TMAX;
    return -1.0;
}

// Fresnel
float fresnel(float cosi, float etai, float etat) {
    float f0 = pow((etai-etat)/(etai+etat), 2.0);
    float hv = 1.0 - cosi;
    return f0 + (1.0 - f0)*pow(hv, 5.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_res.xy) * 2.0 - 1.0;
    uv.x *= u_res.x / u_res.y;
    float t = u_time * 0.2;

    // Build rotation basis from VIB34D params
    mat3 B = basisFrom4DRot(u_rotXW, u_rotYW, u_rotZW);

    vec3 ro, rd;
    camera(uv, ro, rd, B);

    vec3 pHit;
    float thit = raymarch(ro, rd, t, pHit);

    if (thit < 0.0) {
        vec3 bg = envColor(rd);
        // Light vignette for camera
        float r = length(uv * vec2(0.5, 1.0));
        bg *= smoothstep(1.1, 0.6, r);
        fragColor = vec4(bg, 1.0);
        return;
    }

    // Surface hit, calculate lighting
    vec3 n = getNormal(pHit, t);

    // Indices of refraction per channel (simple dispersion)
    float iorBase = 1.2 + u_sat * 0.3 + u_intensity * 0.2;
    float spread  = 0.02 + 0.06*clamp(u_chaos, 0.0, 1.0);
    float iorR = iorBase;
    float iorG = iorBase - spread;
    float iorB = iorBase - 2.0*spread;

    // Entering
    float cosi = dot(n, -rd);
    float etaR = (cosi>0.0) ? (1.0/iorR) : iorR;
    float etaG = (cosi>0.0) ? (1.0/iorG) : iorG;
    float etaB = (cosi>0.0) ? (1.0/iorB) : iorB;
    vec3 nn = (cosi>0.0) ? n : -n;

    vec3 rr = refract(rd, nn, etaR);
    vec3 rg = refract(rd, nn, etaG);
    vec3 rb = refract(rd, nn, etaB);

    // Background sampling along refracted directions
    vec3 envR = envColor(normalize(B * rr));
    vec3 envG = envColor(normalize(B * rg));
    vec3 envB = envColor(normalize(B * rb));
    vec3 refrCol = vec3(envR.r, envG.g, envB.b);

    // Thin-film absorption based on travel distance (approx via thickness)
    float thickness = clamp(thit, 0.0, 1.0);
    vec3 absorption = exp(-vec3(0.6, 0.4, 0.2) * thickness * (0.8 + 0.8*u_intensity));
    refrCol *= absorption;

    // Specular via Fresnel; base reflection + chaos roughness
    float F = fresnel(abs(cosi), 1.0, iorBase);
    vec3 reflD = reflect(rd, n);
    vec3 reflCol = envColor(normalize(B * reflD));
    float rough = mix(0.02, 0.25, u_chaos);
    reflCol = mix(reflCol, envColor(normalize(B * (reflD + (hash21(pHit.xy+t)-0.5)*rough))), rough);

    // Combine
    vec3 col = mix(refrCol, reflCol, F);

    // Rim light
    float rim = pow(1.0 - abs(dot(n,rd)), 3.0) * 0.5;
    col += vec3(1.0) * rim * u_intensity;

    // Global vignette
    float r = length(uv * vec2(0.5, 1.0));
    col *= smoothstep(1.2, 0.7, r);

    // Final intensity and output
    col *= (0.8 + 0.6*u_intensity);
    fragColor = vec4(col, 1.0);
}
