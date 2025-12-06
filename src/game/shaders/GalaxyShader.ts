export const GalaxyShader = `
precision mediump float;

uniform float time;
uniform vec2 resolution;
uniform float zoom;

#define ITERATIONS 4
#define VOLSTEPS 8
#define FORMUPARAM 0.53

#define PI 3.14159265359

// Rotation matrix
mat2 rot(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
}

void main(void)
{
    vec2 uv = (gl_FragCoord.xy - 0.5 * resolution.xy) / resolution.y;
    
    // Zoom control: Higher zoom level = see smaller details (magnify)
    // So we divide UV by zoom.
    // However, user "zoomLevel" in Phaser is: >1 is zoomed in, <1 is zoomed out.
    // So uv /= zoom is correct. 
    uv /= zoom;

    vec3 dir = vec3(uv * zoom, 1.0);
    dir = normalize(dir);
    
    // Animate rotation
    float t = time * 0.0005;
    mat2 rot1 = rot(t);
    mat2 rot2 = rot(t * 0.5);
    
    vec3 from = vec3(1.0, 0.5, 0.5);
    from += vec3(t * 2.0, t, -2.0);
    
    // Volumetric rendering simulation (Starfield + Nebula)
    float s = 0.1, fade = 1.0;
    vec3 v = vec3(0.0);
    
    for (int r = 0; r < VOLSTEPS; r++) {
        vec3 p = from + s * dir * 0.5;
        p = abs(vec3(0.850) - mod(p, vec3(0.850 * 2.0))); // Tiling
        float pa, a = pa = 0.0;
        for (int i = 0; i < ITERATIONS; i++) {
            p = abs(p) / dot(p, p) - FORMUPARAM; // The magic fractal formula
            a += abs(length(p) - pa); // Absolute sum of average change
            pa = length(p);
        }
        float dm = max(0.0, darkmatter - a * a * 0.001); // Dark matter
        a *= a * a; // Add contrast
        if (r > 6) fade *= 1.0 - dm; // Dark matter, don't render near
        v += fade;
        v += vec3(s, s*s, s*s*s*s) * a * brightness * fade; // Coloring based on distance
        fade *= distfading; // Distance fading
        s += stepsize;
    }
    
    v = mix(vec3(length(v)), v, saturation); // Color adjust
    
    // Nebula tinting (Purple/Blue/Teal)
    vec3 color = v * 0.01;
    color *= vec3(0.5, 0.8, 1.5); // Blue tint
    
    // Add a spiral core glow center
    float len = length(uv);
    color += vec3(0.1, 0.2, 0.5) * (1.0 / (len * 20.0));
    
    // Vignette
    color *= 1.0 - smoothstep(0.5, 1.5, length(uv * 0.5));

    gl_FragColor = vec4(color, 1.0);
}
`;

// Simplified Nebula/Galaxy approach for better performance and clear spiral
export const SpiralGalaxyShader = `
precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform float uZoom;
uniform vec2 uScroll; // Camera position for panning

void main( void ) {
    // 1. Setup UVs centered on screen
    vec2 st = gl_FragCoord.xy - 0.5 * uResolution.xy;
    st = st / uResolution.y;

    // 2. Apply Panning (Scroll)
    // We subtract scroll to move the "world" opposite to camera
    // Multiply by small factor (0.001) to make background move slower (Parallax)
    st += uScroll * 0.0005; 

    // 3. Apply Zoom
    // uZoom > 1 means "Zoomed In" (Magnify). So UVs get smaller.
    float z = max(uZoom, 0.1); // Safety clamp
    st /= z;

    // 4. Galaxy Math
    float len = length(st);
    float angle = atan(st.y, st.x);

    // Faster Dynamic rotation
    float rotation = uTime * 0.2; // Speed up rotation
    
    // Spiral Arms
    // Warping angle with distance
    float spiralAngle = angle + len * 5.0 - rotation;
    
    // Create arms
    float arms = sin(spiralAngle * 3.0); // 3 Arms
    arms = smoothstep(0.0, 1.0, arms * arms); // Sharpen
    
    // Falloff
    // Core glow 
    float core = 0.05 / (len + 0.05);
    
    // Arm fadeout as we go out
    float armFade = smoothstep(1.5, 0.2, len);
    float galaxy = arms * armFade;
    
    // 5. Colors
    vec3 finalColor = vec3(0.0);
    
    // Core: Yellow/White
    finalColor += vec3(1.2, 0.8, 0.4) * core;
    
    // Arms: Purple/Blue gradient
    vec3 armColor = mix(vec3(0.2, 0.1, 0.8), vec3(0.8, 0.2, 0.5), len + 0.5);
    finalColor += armColor * galaxy * 2.0;

    // 6. Stars
    // Random noise based on coordinates
    float stars = fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453);
    if (stars > 0.985) {
        float twinkle = sin(uTime * 3.0 + stars * 100.0) * 0.5 + 0.5;
        finalColor += vec3(1.0) * twinkle;
    }

    gl_FragColor = vec4(finalColor, 1.0);
}
`;
