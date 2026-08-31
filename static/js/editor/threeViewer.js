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
    scene.background = new THREE.Color('#0a071b');

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
    const mat = new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 1.0,
        metalness: 0.0,
        clearcoat: 0.0,
        clearcoatRoughness: 0.0,
        side: THREE.DoubleSide,
        bumpMap: fabricBumpTexture,
        bumpScale: 0.015
    });
    return mat;
};

function applyCleanPlanarUVs(geometry, isBack = false) {
    if (!geometry) return;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;

    const posAttr = geometry.attributes.position;
    if (!posAttr) return;

    const minX = bbox.min.x, maxX = bbox.max.x;
    const minY = bbox.min.y, maxY = bbox.max.y;
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;

    const paddingX = 0.03;
    const scaleU = 1 - 2 * paddingX;
    const paddingY = 0.03;
    const scaleV = 1 - 2 * paddingY;

    const uvs = new Float32Array(posAttr.count * 2);

    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);

        let normU = (x - minX) / rangeX;
        if (isBack) {
            normU = (maxX - x) / rangeX;
        }
        let normV = (y - minY) / rangeY;

        let u = paddingX + normU * scaleU;
        let v = paddingY + normV * scaleV;

        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
}

function splitTorsoGeometry(originalMesh) {
    const origGeom = originalMesh.geometry.clone();
    origGeom.computeVertexNormals();
    origGeom.computeBoundingBox();

    const nonIndexed = origGeom.toNonIndexed();
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;
    const vertCount = pos.count;

    const frontPositions = [];
    const frontNormals = [];
    const backPositions = [];
    const backNormals = [];

    for (let i = 0; i < vertCount; i += 3) {
        const nz0 = norm.getZ(i);
        const nz1 = norm.getZ(i + 1);
        const nz2 = norm.getZ(i + 2);
        const avgNz = (nz0 + nz1 + nz2) / 3;

        const isFront = avgNz >= 0;
        const targetPos = isFront ? frontPositions : backPositions;
        const targetNorm = isFront ? frontNormals : backNormals;

        for (let j = 0; j < 3; j++) {
            const idx = i + j;
            targetPos.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
            targetNorm.push(norm.getX(idx), norm.getY(idx), norm.getZ(idx));
        }
    }

    // Build Front Geometry
    const frontGeom = new THREE.BufferGeometry();
    frontGeom.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3));
    frontGeom.setAttribute('normal', new THREE.Float32BufferAttribute(frontNormals, 3));
    applyCleanPlanarUVs(frontGeom, false);

    // Build Back Geometry
    const backGeom = new THREE.BufferGeometry();
    backGeom.setAttribute('position', new THREE.Float32BufferAttribute(backPositions, 3));
    backGeom.setAttribute('normal', new THREE.Float32BufferAttribute(backNormals, 3));
    applyCleanPlanarUVs(backGeom, true);

    const frontMesh = new THREE.Mesh(frontGeom, cleanMaterial('#4F46E5'));
    frontMesh.name = 'jersey_front';
    frontMesh.position.copy(originalMesh.position);
    frontMesh.rotation.copy(originalMesh.rotation);
    frontMesh.scale.copy(originalMesh.scale);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;

    const backMesh = new THREE.Mesh(backGeom, cleanMaterial('#4F46E5'));
    backMesh.name = 'jersey_back';
    backMesh.position.copy(originalMesh.position);
    backMesh.rotation.copy(originalMesh.rotation);
    backMesh.scale.copy(originalMesh.scale);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;

    if (originalMesh.parent) {
        originalMesh.parent.add(frontMesh);
        originalMesh.parent.add(backMesh);
        originalMesh.visible = false;
    }

    return { frontMesh, backMesh };
}

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
            jerseyGroup.position.y += 0.15;

            scene.add(jerseyGroup);

            const mannequinMeshes = [];
            const trimMeshes = [];
            const shoeMeshes = [];
            let shirtMeshFound = null;

            jerseyGroup.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    const name = child.name.toLowerCase().trim();
                    console.log('Mesh found:', child.name);

                    if (name === 'jersey_front') {
                        child.material = cleanMaterial('#4F46E5');
                        applyCleanPlanarUVs(child.geometry, false);
                        meshParts['jersey_front'] = child;
                    } else if (name === 'jersey_back') {
                        child.material = cleanMaterial('#4F46E5');
                        applyCleanPlanarUVs(child.geometry, true);
                        meshParts['jersey_back'] = child;
                    } else if (name === 'shirt' || name === 'jersey_body' || name === 'torso') {
                        shirtMeshFound = child;
                    } else if (name === 'short' || name === 'shorts') {
                        child.material = cleanMaterial('#7C3AED');
                        meshParts['shorts'] = child;
                    } else if (name.includes('neckband') || name.includes('armband')) {
                        child.material = cleanMaterial('#ffffff');
                        trimMeshes.push(child);
                        meshParts[child.name] = child;
                    } else if (name === 'head' || name.includes('hand') || name.includes('leg') || name.includes('mannequin')) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: '#1e293b',
                            roughness: 0.8,
                            metalness: 0.2
                        });
                        mannequinMeshes.push(child);
                    } else if (name.includes('sock')) {
                        child.material = cleanMaterial('#ffffff');
                        trimMeshes.push(child);
                        meshParts[child.name] = child;
                    } else if (name.includes('shoe')) {
                        child.material = new THREE.MeshStandardMaterial({
                            color: '#0f172a',
                            roughness: 0.6,
                            metalness: 0.3
                        });
                        shoeMeshes.push(child);
                    } else {
                        child.material = new THREE.MeshStandardMaterial({
                            color: '#1e293b',
                            roughness: 0.7,
                            metalness: 0.2
                        });
                    }
                }
            });

            if (shirtMeshFound && (!meshParts['jersey_front'] || !meshParts['jersey_back'])) {
                const { frontMesh, backMesh } = splitTorsoGeometry(shirtMeshFound);
                meshParts['jersey_front'] = frontMesh;
                meshParts['jersey_back'] = backMesh;
                meshParts['jersey_body'] = shirtMeshFound;
            }

            meshParts['mannequin_list'] = mannequinMeshes;
            meshParts['trim_list'] = trimMeshes;
            meshParts['shoe_list'] = shoeMeshes;
            if (mannequinMeshes.length > 0) {
                meshParts['mannequin'] = mannequinMeshes[0];
            }

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
    meshParts['jersey_front'] = body;
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
    if (partName === 'trim' && meshParts['trim_list']) {
        meshParts['trim_list'].forEach(mesh => {
            if (mesh && mesh.material) {
                mesh.material.color.set(color);
                mesh.material.needsUpdate = true;
            }
        });
    }
    if (meshParts[partName]) {
        meshParts[partName].material.color.set(color);
        meshParts[partName].material.needsUpdate = true;
    }
}

export function setMannequinColor(color) {
    if (meshParts['mannequin_list']) {
        meshParts['mannequin_list'].forEach(mesh => {
            if (mesh && mesh.material) {
                mesh.material.color.set(color);
                mesh.material.needsUpdate = true;
            }
        });
    } else if (meshParts['mannequin']) {
        meshParts['mannequin'].material.color.set(color);
        meshParts['mannequin'].material.needsUpdate = true;
    }
}

let cachedTrimCanvas = null;
let cachedTrimTexture = null;

export function setTrimColor(primaryColor, secondaryColor) {
    if (!meshParts['trim_list'] || meshParts['trim_list'].length === 0) return;

    const color1 = primaryColor || '#7C3AED';
    const color2 = secondaryColor || '#ffffff';

    if (!cachedTrimCanvas) {
        cachedTrimCanvas = document.createElement('canvas');
        cachedTrimCanvas.width = 64;
        cachedTrimCanvas.height = 64;
    }
    const ctx = cachedTrimCanvas.getContext('2d');

    ctx.fillStyle = color1;
    ctx.fillRect(0, 0, 64, 64);

    ctx.fillStyle = color2;
    ctx.fillRect(0, 20, 64, 24);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    for (let x = 0; x < 64; x += 4) {
        ctx.fillRect(x, 0, 1, 64);
    }

    if (!cachedTrimTexture) {
        cachedTrimTexture = new THREE.CanvasTexture(cachedTrimCanvas);
        cachedTrimTexture.wrapS = THREE.RepeatWrapping;
        cachedTrimTexture.wrapT = THREE.RepeatWrapping;
        cachedTrimTexture.repeat.set(8, 1);
    } else {
        cachedTrimTexture.needsUpdate = true;
    }

    meshParts['trim_list'].forEach(mesh => {
        if (mesh && mesh.material) {
            mesh.material.color.set('#ffffff');
            mesh.material.map = cachedTrimTexture;
            mesh.material.needsUpdate = true;
        }
    });
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
            mesh.material.bumpScale = name === 'shorts' ? Math.min(bumpScale, 0.003) : bumpScale;
            mesh.material.needsUpdate = true;
        }
    });
}

export function changeEnvironment(envName) {
    if (!scene) return;

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

        const geom = new THREE.CylinderGeometry(0.03, 0.03, 3.2, 16);

        const matPink = new THREE.MeshBasicMaterial({ color: 0xff007f });
        const tubePink = new THREE.Mesh(geom, matPink);
        tubePink.position.set(-1.8, 0.6, -1.8);
        showroomGroup.add(tubePink);

        const matCyan = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const tubeCyan = new THREE.Mesh(geom, matCyan);
        tubeCyan.position.set(1.8, 0.6, -1.8);
        showroomGroup.add(tubeCyan);

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

        dirLight.color.set(0xffe9d0);
        dirLight.intensity = 2.4;

        fillLight.color.set(0xffd59e);
        fillLight.intensity = 0.8;
        fillLight.position.set(-5, 3, 3);

        backLight.color.set(0xffab5c);
        backLight.intensity = 0.5;
        backLight.position.set(0, 4, -4);

        const helperGeom = new THREE.RingGeometry(0.8, 0.9, 32);
        const helperMat = new THREE.MeshBasicMaterial({ color: 0x221a10, side: THREE.DoubleSide });
        const helper = new THREE.Mesh(helperGeom, helperMat);
        helper.rotation.x = Math.PI / 2;
        helper.position.y = -1.2;
        showroomGroup.add(helper);

    } else if (envName === 'stadium') {
        scene.background = new THREE.Color('#0c100d');
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