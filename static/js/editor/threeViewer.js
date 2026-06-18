import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let meshParts = {};
let jerseyGroup = null;
let showroomGroup = null;
let fabricBumpTexture = null;
let carbonBumpTexture = null;

// Global light references to modify dynamically
let ambientLight, dirLight, fillLight, backLight;

export function initViewer(canvasId) {
    const canvas = document.getElementById(canvasId);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    // 1. Create Procedural Textures
    fabricBumpTexture = createFabricBumpTexture();
    carbonBumpTexture = createCarbonBumpTexture();

    // 2. Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#0a071b'); // Default Cyber dark background

    // 3. Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 0.8, 3.8);

    // 4. Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 5. Setup Showroom Group
    showroomGroup = new THREE.Group();
    scene.add(showroomGroup);

    // 6. Base Lights
    ambientLight = new THREE.AmbientLight(0xffffff, 1.8);
    scene.add(ambientLight);

    dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    fillLight = new THREE.DirectionalLight(0x00ffff, 0.8);
    fillLight.position.set(-6, 2, 4);
    scene.add(fillLight);

    backLight = new THREE.DirectionalLight(0xff007f, 0.8);
    backLight.position.set(0, 4, -6);
    scene.add(backLight);

    // 7. Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 6.5;
    controls.target.set(0, 0.1, 0);

    // 8. Set Default Cyber Showroom
    changeEnvironment('cyber');

    // 9. Load the GLB model
    tryLoadGLB('/static/assets/models/jersey.glb?v=' + Date.now());

    // Resize handler
    window.addEventListener('resize', () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    animate();
}

// Procedural micro-knit sportswear bump map
function createFabricBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#b0b0b0';
    for (let x = 0; x < 16; x += 4) {
        for (let y = 0; y < 16; y += 4) {
            if ((x + y) % 8 === 0) {
                ctx.fillRect(x, y, 2, 2);
            } else {
                ctx.fillStyle = '#505050';
                ctx.fillRect(x, y, 2, 2);
                ctx.fillStyle = '#b0b0b0';
            }
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);
    return texture;
}

// Procedural carbon fiber bump map
function createCarbonBumpTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 16, 16);

    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillRect(8, 8, 8, 8);

    ctx.fillStyle = '#404040';
    ctx.fillRect(8, 0, 8, 8);
    ctx.fillRect(0, 8, 8, 8);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    return texture;
}

const cleanMaterial = (color) => {
    // Upgraded to MeshPhysicalMaterial to support metallic/glossy satin finishes
    const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 1.0,
        metalness: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
        side: THREE.FrontSide,
        bumpMap: fabricBumpTexture,
        bumpScale: 0.015
    });
    return mat;
};

function tryLoadGLB(path) {
    const loader = new GLTFLoader();
    showLoadingUI(true);

    loader.load(
        path,
        (gltf) => {
            console.log('GLB loaded successfully');
            showLoadingUI(false);

            jerseyGroup = gltf.scene;

            const box = new THREE.Box3().setFromObject(jerseyGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.4 / maxDim;

            jerseyGroup.scale.setScalar(scale);
            jerseyGroup.position.sub(center.multiplyScalar(scale));
            // Move up slightly to frame it nicely
            jerseyGroup.position.y += 0.15;

            scene.add(jerseyGroup);

            jerseyGroup.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    const name = child.name.toLowerCase();
                    console.log('Mesh found:', child.name);

                    if (name === 'jersey_front' || name.includes('jersey_front')) {
                        child.material = cleanMaterial('#4F46E5');
                        meshParts['jersey_front'] = child;
                    } else if (name === 'jersey_back' || name.includes('jersey_back')) {
                        child.material = cleanMaterial('#4F46E5');
                        meshParts['jersey_back'] = child;
                    } else if (name === 'jersey_body' || name.includes('jersey_body')) {
                        child.material = cleanMaterial('#4F46E5');
                        meshParts['jersey_body'] = child;
                    } else if (name === 'shorts' || name.includes('shorts')) {
                        child.material = cleanMaterial('#7C3AED');
                        meshParts['shorts'] = child;
                    } else if (name === 'body_mannequin' || name.includes('mannequin')) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: '#1e293b',
                            roughness: 0.8,
                            metalness: 0.2
                        });
                        meshParts['mannequin'] = child;
                    }
                }
            });

            console.log('Mapped parts:', Object.keys(meshParts));

            if (Object.keys(meshParts).length === 0) {
                jerseyGroup.traverse((child) => {
                    if (child.isMesh) {
                        meshParts['body'] = child;
                    }
                });
            }
            window.dispatchEvent(new Event('viewer:ready'));
        },
        (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            updateLoadingProgress(percent);
        },
        (error) => {
            console.warn('GLB not found, using procedural placeholder:', error);
            showLoadingUI(false);
            buildPlaceholderJersey();
        }
    );
}

function buildPlaceholderJersey() {
    jerseyGroup = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.5, 0.3),
        cleanMaterial('#4F46E5')
    );
    jerseyGroup.add(body);
    meshParts['jersey_body'] = body;
    meshParts['jersey_front'] = body; // Map front to body for placeholder
    meshParts['jersey_back'] = body;

    const sleeveMat = cleanMaterial('#7C3AED');

    const leftSleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.28),
        sleeveMat
    );
    leftSleeve.position.set(-0.85, 0.55, 0);
    jerseyGroup.add(leftSleeve);
    meshParts['sleeve_left'] = leftSleeve;

    const rightSleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.28),
        sleeveMat.clone()
    );
    rightSleeve.position.set(0.85, 0.55, 0);
    jerseyGroup.add(rightSleeve);
    meshParts['sleeve_right'] = rightSleeve;

    const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.12, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: '#1E1B4B', side: THREE.DoubleSide })
    );
    collar.position.set(0, 0.82, 0);
    jerseyGroup.add(collar);
    meshParts['collar'] = collar;

    scene.add(jerseyGroup);
}

function showLoadingUI(show) {
    let el = document.getElementById('loadingUI');
    if (!el) return;
    el.style.display = show ? 'flex' : 'none';
}

function updateLoadingProgress(percent) {
    let el = document.getElementById('loadingPercent');
    if (!el) return;
    el.textContent = percent + '%';
}

export function setPartColor(partName, color) {
    if (meshParts[partName]) {
        meshParts[partName].material.color.set(color);
        meshParts[partName].material.needsUpdate = true;
    }
}

export function setMannequinColor(color) {
    if (meshParts['mannequin']) {
        meshParts['mannequin'].material.color.set(color);
        meshParts['mannequin'].material.needsUpdate = true;
    }
}

export function applyTextureToFront(canvasTexture) {
    if (meshParts['jersey_front']) {
        meshParts['jersey_front'].material.map = canvasTexture;
        meshParts['jersey_front'].material.needsUpdate = true;
    }
}

export function applyTextureToBack(canvasTexture) {
    if (meshParts['jersey_back']) {
        meshParts['jersey_back'].material.map = canvasTexture;
        meshParts['jersey_back'].material.needsUpdate = true;
    }
}

export function applyTextureToPanel(canvasTexture) {
    applyTextureToFront(canvasTexture);
}

export function setAllMeshesColor(color) {
    Object.values(meshParts).forEach(mesh => {
        if (mesh && mesh.material) {
            mesh.material.color.set(color);
        }
    });
}

export function getMeshParts() {
    return meshParts;
}

// Material finish logic using MeshPhysicalMaterial settings
export function applyMaterialFinish(finishName) {
    let roughness = 1.0;
    let metalness = 0.0;
    let clearcoat = 0.0;
    let clearcoatRoughness = 0.0;
    let activeBumpMap = fabricBumpTexture;
    let bumpScale = 0.015;

    if (finishName === 'matte') {
        roughness = 1.0;
        metalness = 0.05;
        bumpScale = 0.018;
    } else if (finishName === 'satin') {
        roughness = 0.28;
        metalness = 0.15;
        clearcoat = 0.55;
        clearcoatRoughness = 0.15;
        bumpScale = 0.012;
    } else if (finishName === 'metallic') {
        roughness = 0.12;
        metalness = 0.85;
        clearcoat = 0.85;
        clearcoatRoughness = 0.05;
        bumpScale = 0.005;
    } else if (finishName === 'carbon') {
        roughness = 0.45;
        metalness = 0.35;
        clearcoat = 0.2;
        activeBumpMap = carbonBumpTexture;
        bumpScale = 0.035;
    }

    const targetMeshes = ['jersey_front', 'jersey_back', 'jersey_body', 'shorts', 'sleeve_left', 'sleeve_right'];
    targetMeshes.forEach(name => {
        const mesh = meshParts[name];
        if (mesh && mesh.material) {
            mesh.material.roughness = roughness;
            mesh.material.metalness = metalness;
            if (mesh.material.clearcoat !== undefined) {
                mesh.material.clearcoat = clearcoat;
                mesh.material.clearcoatRoughness = clearcoatRoughness;
            }
            mesh.material.bumpMap = activeBumpMap;
            mesh.material.bumpScale = bumpScale;
            mesh.material.needsUpdate = true;
        }
    });
}

// Interactive lighting showrooms
export function changeEnvironment(envName) {
    if (!scene) return;

    // 1. Clear previous showroom meshes / lights
    while (showroomGroup.children.length > 0) {
        showroomGroup.remove(showroomGroup.children[0]);
    }

    if (envName === 'cyber') {
        scene.background = new THREE.Color('#080512');
        ambientLight.color.set(0xffffff);
        ambientLight.intensity = 1.2;

        dirLight.color.set(0xffffff);
        dirLight.intensity = 1.8;

        fillLight.color.set(0x00ffff);
        fillLight.intensity = 1.2;
        fillLight.position.set(-5, 2, 4);

        backLight.color.set(0xff007f);
        backLight.intensity = 1.2;
        backLight.position.set(2, 3, -5);

        // Add 2 glowing background vertical tubes
        const geom = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 16);

        // Pink neon
        const matPink = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const tubePink = new THREE.Mesh(geom, matPink);
        tubePink.position.set(-1.8, 0.6, -1.8);
        showroomGroup.add(tubePink);

        // Cyan neon
        const matCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const tubeCyan = new THREE.Mesh(geom, matCyan);
        tubeCyan.position.set(1.8, 0.6, -1.8);
        showroomGroup.add(tubeCyan);

        // Add colored point lights next to neon tubes for ambient reflection
        const pLightPink = new THREE.PointLight(0xff007f, 3.5, 6);
        pLightPink.position.set(-1.8, 0.6, -1.4);
        showroomGroup.add(pLightPink);

        const pLightCyan = new THREE.PointLight(0x00ffff, 3.5, 6);
        pLightCyan.position.set(1.8, 0.6, -1.4);
        showroomGroup.add(pLightCyan);

    } else if (envName === 'locker') {
        scene.background = new THREE.Color('#141416');
        ambientLight.color.set(0xffffff);
        ambientLight.intensity = 0.8;

        dirLight.color.set(0xffe9d0); // Warm gold spotlight
        dirLight.intensity = 2.4;

        fillLight.color.set(0xffd59e);
        fillLight.intensity = 0.8;
        fillLight.position.set(-5, 3, 3);

        backLight.color.set(0xffab5c);
        backLight.intensity = 0.5;
        backLight.position.set(0, 4, -4);

        // Warm floor shadow panel helper
        const helperGeom = new THREE.RingGeometry(0.8, 0.9, 32);
        const helperMat = new THREE.MeshBasicMaterial({ color: 0x221a10, side: THREE.DoubleSide });
        const helper = new THREE.Mesh(helperGeom, helperMat);
        helper.rotation.x = Math.PI / 2;
        helper.position.y = -1.2;
        showroomGroup.add(helper);

    } else if (envName === 'stadium') {
        scene.background = new THREE.Color('#0c100d'); // Dark pitch green atmosphere
        ambientLight.color.set(0xffffff);
        ambientLight.intensity = 1.4;

        dirLight.color.set(0xffffff);
        dirLight.intensity = 3.0;

        fillLight.color.set(0xe6f0ff);
        fillLight.intensity = 1.4;
        fillLight.position.set(-6, 4, 5);

        backLight.color.set(0xffffff);
        backLight.intensity = 0.8;
        backLight.position.set(0, 5, -5);
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}