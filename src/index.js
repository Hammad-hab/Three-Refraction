import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/Addons.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const cursor = new THREE.Vector2();
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true});
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
scene.background = new THREE.Color('#091221')
// Create render target for background
const target = new THREE.WebGLRenderTarget(window.innerWidth*4.0, window.innerHeight*4.0, {
});

// Create background sphere
// const bgGeometry = new THREE.SphereGeometry(50, 32, 32);
// const bgMaterial = new THREE.MeshBasicMaterial({
//   color: 0x4488ff,
//   side: THREE.BackSide
// });
// const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
// scene.add(bgSphere);

// Add some colorful objects to see refraction
// const sphere1 = new THREE.Mesh(
//   new THREE.SphereGeometry(0.5, 32, 32),
//   new THREE.MeshBasicMaterial({ color: 0xff0000 })
// );
// sphere1.position.set(-2, 0, -2);
// scene.add(sphere1);

// const sphere2 = new THREE.Mesh(
//   new THREE.SphereGeometry(0.5, 32, 32),
//   new THREE.MeshBasicMaterial({ color: 0x00ff00 })
// );
// sphere2.position.set(2, 1, -1);
// scene.add(sphere2);

// const sphere3 = new THREE.Mesh(
//   new THREE.SphereGeometry(0.7, 32, 32),
//   new THREE.MeshBasicMaterial({ color: 0xff00ff })
// );
// sphere3.position.set(0, -1, -3);
// scene.add(sphere3);

// Refractive object
const geometry = new THREE.BoxGeometry(2, 2, 1);
const sphere = new THREE.IcosahedronGeometry(1, 20);
const material = new THREE.ShaderMaterial({
  uniforms: {
    uTime: {value: 0.0},
    camPosition: {value: new THREE.Vector3()},
    uTexture: {value: target.texture},
    camMatrix: {value: camera.matrix},
    winResolution: {value: new THREE.Vector2(window.innerWidth, window.innerHeight).multiplyScalar(Math.min(window.devicePixelRatio, 2))}
  },
  vertexShader: `
    varying vec3 worldNormal;
    varying vec3 eyeVector;
    varying vec3 gNormal;
    varying vec3 fragPosition;
    varying vec2 vUv;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vec4 mvPosition = viewMatrix * worldPos;

      gl_Position = projectionMatrix * mvPosition;

      vec3 transformedNormal = normalMatrix * normal;
      // worldNormal = normalize(transformedNormal);
      worldNormal = normalize(mat3(modelMatrix) * normal);
      vUv = uv;
      gNormal = normal;
      fragPosition = worldPos.xyz;
      eyeVector = normalize(worldPos.xyz - cameraPosition);
    }

  `,
  fragmentShader: `
 uniform vec2 winResolution;
uniform sampler2D uTexture;

varying vec3 worldNormal;
varying vec3 gNormal;
varying vec2 vUv;
varying vec3 eyeVector;
uniform mat4 camMatrix;
varying vec3 fragPosition;
uniform vec3 camPosition;



void main() {
float iorRatioRed   = 1.1 / 1.0;
float iorRatioGreen = 1.12 / 1.0;
float iorRatioBlue  = 1.13 / 1.0;
  vec3 color = vec3(0.0);

  vec2 uv = gl_FragCoord.xy / winResolution.xy;
  vec3 normal = worldNormal;


  for (float i = 0.0; i < 100.0; i ++) {
      float slide = i / 1500.0;
      vec3 refractVecR = refract(eyeVector, normal, iorRatioRed);
      vec3 refractVecG = refract(eyeVector, normal, iorRatioGreen);
      vec3 refractVecB = refract(eyeVector, normal, iorRatioBlue);

      float R;
      float G;
      float B;
     if (dot(refractVecR, refractVecR) == 0.0) {
        vec3 reflectDir = reflect(eyeVector, normal);
         R = texture2D(uTexture, uv + reflectDir.xy).r;
         G = texture2D(uTexture, uv + reflectDir.xy).g;
         B = texture2D(uTexture, uv + reflectDir.xy).b;
        //  R = 1.0;
        //    G =0.0;
        //    B =0.0;
      } else {
          R = texture2D(uTexture, uv + refractVecR.xy * (0.5+slide *1.0)).r;
           G = texture2D(uTexture, uv + refractVecG.xy * (0.5+slide *1.0)).g;
           B = texture2D(uTexture, uv + refractVecB.xy * (0.5+slide *1.0)).b;
        }

      color.r += R;
      color.g += G;
      color.b += B;
  }
  color /= 100.0;

  vec3 lightPos = vec3(1.0, 2.0, 0.0);
  vec3 light = normalize(lightPos - fragPosition);
  vec3 reflectVector = reflect(-normalize(light), normalize(worldNormal));
  vec3 viewDir = normalize( -eyeVector);
  
  float spec = pow(max(dot(viewDir, reflectVector), 0.0),5.0);
  float intensity = max(dot(light, gNormal), 0.5);

  gl_FragColor = intensity*vec4(vec3(color.rgb), 1.0) + (spec);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
  `,
});

const plane = new THREE.Mesh(geometry, new THREE.MeshMatcapMaterial());
plane.rotation.x = -Math.PI * 0.5;

const sp = new THREE.Mesh(sphere, material);
sp.position.y += 1.5
scene.add(sp, plane);

const cube = new THREE.Mesh(
  new THREE.PlaneGeometry(10, 10),
  new THREE.MeshStandardMaterial({  side: 2, color: new THREE.Color("#d6e6ff") })
);
cube.rotation.x = -Math.PI * 0.5
cube.position.y -= 0.51;

const light = new THREE.PointLight()
light.y += 4.0
scene.add(cube, light);

window.addEventListener("mousemove", e => {
  cursor.x = e.clientX / window.innerWidth - 0.5;
  cursor.y = - e.clientY / window.innerHeight + 0.5;
});

camera.position.z = 5;

// Add orbit controls
const controls = new OrbitControls(camera, renderer.domElement);


// Group to hold background objects
const clutter = new THREE.Group();
scene.add(clutter);

// Materials to reuse
const materials = [
  new THREE.MeshBasicMaterial({ color: 0xff5555 }),
  new THREE.MeshBasicMaterial({ color: 0x55ff55 }),
  new THREE.MeshBasicMaterial({ color: 0x5555ff }),
  new THREE.MeshBasicMaterial({ color: 0xffff55 }),
  new THREE.MeshBasicMaterial({ color: 0xff55ff }),
  new THREE.MeshBasicMaterial({ color: 0x55ffff }),
];

// Geometry pool
const geometries = [
  new THREE.SphereGeometry(0.3, 24, 24),
  new THREE.BoxGeometry(0.5, 0.5, 0.5),
  new THREE.TorusGeometry(0.3, 0.12, 16, 32),
  new THREE.OctahedronGeometry(0.4),
];

// Utility
function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// Create many objects
const COUNT = 1000;

for (let i = 0; i < COUNT; i++) {
  const geo = geometries[Math.floor(Math.random() * geometries.length)];
  const mat =new THREE.MeshMatcapMaterial()

  const mesh = new THREE.Mesh(geo, mat);

  // Place objects in a spherical shell around origin
  const radius = rand(4, 12);
  const theta = rand(0, Math.PI * 2);
  const phi = rand(0, Math.PI);

  mesh.position.set(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );

  mesh.rotation.set(
    rand(0, Math.PI),
    rand(0, Math.PI),
    rand(0, Math.PI)
  );

  clutter.add(mesh);
}


function animate() {
  requestAnimationFrame(animate);
  
  // Render background without refractive object
  sp.visible = false;
  renderer.setRenderTarget(target);
  renderer.render(scene, camera);
  
  // Render full scene with refractive object
  renderer.setRenderTarget(null);
  sp.visible = true;
  sp.material.uniforms.uTime.value += 0.01;
  sp.material.uniforms.camPosition.value = camera.position
  sp.material.uniforms.uTexture.value = target.texture;
  
  renderer.render(scene, camera);
}

animate();