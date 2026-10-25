import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let meshParts = {};
let jerseyGroup = null;
let showroomGroup = null;
let fabricBumpTexture = null;
let carbonBumpTexture = null;

// Animation system (disabled — T-pose only)
const clock = new THREE.Clock();

// Global light references to modify dynamically
let ambientLight, dirLight, fillLight, backLight;

export const PRESET_SKINS = {
    'obsidian': {
        id: 'obsidian',
        name: 'Studio Slate',
        color: '#1e293b',
        roughness: 0.80,
        metalness: 0.15,
        preview: '#1e293b'
    },
    'fair': {
        id: 'fair',
        name: 'Fair / Porcelain',
        color: '#f6d2b8',
        roughness: 0.65,
        metalness: 0.05,
        preview: '#f6d2b8'
    },
    'warm-beige': {
        id: 'warm-beige',
        name: 'Warm Beige',
        color: '#e4b58e',
        roughness: 0.65,
        metalness: 0.05,
        preview: '#e4b58e'
    },
    'honey': {
        id: 'honey',
        name: 'Honey / Olive',
        color: '#c68b59',
        roughness: 0.65,
        metalness: 0.05,
        preview: '#c68b59'
    },
    'bronze': {
        id: 'bronze',
        name: 'Rich Bronze',
        color: '#9d633b',
        roughness: 0.65,
        metalness: 0.05,
        preview: '#9d633b'
    },
    'chestnut': {
        id: 'chestnut',
        name: 'Chestnut Brown',
        color: '#6c3e23',
        roughness: 0.65,
        metalness: 0.05,
        preview: '#6c3e23'
    },
    'espresso': {
        id: 'espresso',
        name: 'Deep Espresso',
        color: '#382015',
        roughness: 0.70,
        metalness: 0.05,
        preview: '#382015'
    },
    'matte-white': {
        id: 'matte-white',
        name: 'Matte White',
        color: '#f8fafc',
        roughness: 0.55,
        metalness: 0.05,
        preview: '#f8fafc'
    },
    'cyber-chrome': {
        id: 'cyber-chrome',
        name: 'Cyber Chrome',
        color: '#94a3b8',
        roughness: 0.20,
        metalness: 0.85,
        preview: '#94a3b8'
    },
    'gold': {
        id: 'gold',
        name: 'Metallic Bronze Gold',
        color: '#523e1b',
        roughness: 0.30,
        metalness: 0.75,
        preview: '#d97706'
    }
};

let currentSkinKey = 'obsidian';

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
    camera.position.set(0, 0.2, 3.4);

    // 4. Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

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

    // 9. Load the 3D model
    loadJerseyModel('sleeveless');

    // Resize handler
    window.addEventListener('resize', () => {
        const w = canvas.clientWidth || window.innerWidth;
        const h = canvas.clientHeight || window.innerHeight;
        if (w > 0 && h > 0) {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
            renderer.setSize(w, h);
            if (jerseyGroup) {
                fitCameraToObject(camera, controls, jerseyGroup, 1.9);
            }
        }
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
        roughness: 0.55,
        metalness: 0.0,
        clearcoat: 0.05,
        clearcoatRoughness: 0.1,
        side: THREE.DoubleSide,
        bumpMap: fabricBumpTexture,
        bumpScale: 0.005
    });
    return mat;
};

/**
 * Conformal Arc-Length Cylindrical Torso Unwrapping.
 * 
 * Eliminates lateral flank horizontal smearing and stretching by parameterizing UVs
 * proportionally to circumferential surface arc-length around the torso ellipse.
 * Perfectly aligns with 2D front/back silhouettes and side seams with 1-to-1 fidelity.
 *
 * @param {THREE.BufferGeometry} geometry - Target mesh geometry
 * @param {boolean} isBack - True for back half, false for front half
 * @param {THREE.Box3} [customBBox] - Optional bounding box of the entire jersey
 * @param {number} [customCenterZ] - Coronal split plane Z coordinate
 */
/**
 * Computes anatomical landmarks (shoulder, front neck scoop dip, armpit, hem)
 * from 3D jersey geometry to achieve 1-to-1 fidelity with 2D canvas designs.
 */
function computeJerseyLandmarks(geometry, bbox, centerZ) {
    const pos = geometry.attributes.position;
    const count = pos.count;
    const minX = bbox.min.x, maxX = bbox.max.x;
    const minY = bbox.min.y, maxY = bbox.max.y;
    const minZ = bbox.min.z, maxZ = bbox.max.z;
    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;
    const rangeZ = (maxZ - minZ) || 1;
    const centerX = (minX + maxX) / 2;

    const yShoulder = maxY;
    const yHem = minY;

    let maxFrontY = -Infinity;
    let minFrontHemY = Infinity;
    let maxBackY = -Infinity;

    // Filter strictly front and back center column vertices
    const centerTol = rangeX * 0.06;
    for (let i = 0; i < count; i++) {
        const x = pos.getX(i);
        const y = pos.getY(i);
        const z = pos.getZ(i);

        const dx = Math.abs(x - centerX);
        if (dx < centerTol) {
            // Front cloth: z > centerZ + 0.005
            if (z > centerZ + 0.005) {
                if (y > maxFrontY) maxFrontY = y;
                if (y < minFrontHemY) minFrontHemY = y;
            }
            // Back cloth: z < centerZ - 0.005
            if (z < centerZ - 0.005) {
                if (y > maxBackY) maxBackY = y;
            }
        }
    }

    const yNeck = (maxFrontY > yHem + 0.5 * rangeY) ? maxFrontY : (yHem + 0.85 * rangeY);
    const yFrontHem = (minFrontHemY < Infinity) ? minFrontHemY : yHem;
    const yBackNeck = (maxBackY > yHem + 0.5 * rangeY) ? maxBackY : (yHem + 0.90 * rangeY);

    return { yShoulder, yNeck, yFrontHem, yBackNeck, yHem };
}

/**
 * Landmark-Aligned Conformal Torso Unwrapping.
 * 
 * Maps 3D jersey meshes to 2D design canvases with true 1-to-1 fidelity:
 * 1. Continuous vertical landmark mapping: guarantees team names below collar,
 *    centered logos, mid-chest sponsors, and bottom-hem stripes align exactly as drawn in 2D
 *    without piecewise stretching or flattening.
 * 2. Blended orthographic + arc-length horizontal mapping: preserves 100% full width and
 *    natural athletic aspect ratio across the front chest while preventing side-flank smearing.
 *
 * @param {THREE.BufferGeometry} geometry - Target mesh geometry
 * @param {boolean} isBack - True for back half, false for front half
 * @param {THREE.Box3} [customBBox] - Optional bounding box of the entire jersey
 * @param {number} [customCenterZ] - Coronal split plane Z coordinate
 * @param {Object} [customLandmarks] - Precomputed landmark heights {yShoulder, yNeck, yBackNeck, yHem}
 */
function applyTorsoConformalUVs(geometry, isBack = false, customBBox = null, customCenterZ = null, customLandmarks = null) {
    if (!geometry) return;
    if (!customBBox) {
        geometry.computeBoundingBox();
    }
    const bbox = customBBox || geometry.boundingBox;

    const posAttr = geometry.attributes.position;
    if (!posAttr) return;

    const minX = bbox.min.x, maxX = bbox.max.x;
    const minY = bbox.min.y, maxY = bbox.max.y;
    const minZ = bbox.min.z, maxZ = bbox.max.z;

    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    const centerX = (minX + maxX) / 2;
    const centerZ = (customCenterZ !== null && customCenterZ !== undefined && !isNaN(customCenterZ))
        ? customCenterZ
        : (minZ + maxZ) / 2;

    const isTshirtWithSleeves = (rangeX > rangeZ * 2.2);

    let torsoRx = rangeX / 2;
    if (isTshirtWithSleeves) {
        torsoRx = rangeX * 0.26;
    }
    const torsoRz = rangeZ / 2;

    // Get or compute anatomical landmarks
    const landmarks = customLandmarks || computeJerseyLandmarks(geometry, bbox, centerZ);
    const { yShoulder, yNeck, yBackNeck, yHem } = landmarks;

    // 2D Canvas Target Landmarks:
    // vShoulder: Y=44 (male tank), Y=48 (female tank), Y=30 (tshirt)
    // vNeck: Front collar rim dip mapped to V = 0.865 (Y = 69px, gives clean 25px+ clearance for team text)
    // vBackNeck: Back collar rim dip mapped to V = 0.898 (Y = 52px)
    // vHem: Bottom hem mapped to V = 0.086 (Y = 468px) for tank, 0.051 (Y = 486px) for tshirt
    const vShoulder = isTshirtWithSleeves ? 0.941 : 0.914;
    const vNeck = 0.865;
    const vBackNeck = isTshirtWithSleeves ? 0.926 : 0.898;
    const vHem = isTshirtWithSleeves ? 0.051 : 0.086;

    // Horizontal scale: 0.355 for sleeveless (gives exact 1:1 aspect ratio), 0.28 for tshirt torso
    const uHalf = isTshirtWithSleeves ? 0.28 : 0.355;
    const uvs = new Float32Array(posAttr.count * 2);

    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);

        // Continuous, 100% distortion-free vertical landmark mapping:
        let v;
        if (!isBack) {
            if (y >= yNeck) {
                // Shoulder straps above front neck scoop
                const t = (y - yNeck) / ((yShoulder - yNeck) || 1e-4);
                v = vNeck + t * (vShoulder - vNeck);
            } else {
                // Entire front torso from neck scoop to waistband: single uniform scale!
                const t = (y - yHem) / ((yNeck - yHem) || 1e-4);
                v = vHem + t * (vNeck - vHem);
            }
        } else {
            if (y >= yBackNeck) {
                // Shoulder straps above back neck scoop
                const t = (y - yBackNeck) / ((yShoulder - yBackNeck) || 1e-4);
                v = vBackNeck + t * (vShoulder - vBackNeck);
            } else {
                // Entire back torso from back neck scoop to hem: single uniform scale!
                const t = (y - yHem) / ((yBackNeck - yHem) || 1e-4);
                v = vHem + t * (vBackNeck - vHem);
            }
        }

        const dx = x - centerX;
        const dz = z - centerZ;

        let u = 0.50;

        if (!isTshirtWithSleeves) {
            // Sleeveless athletic jersey (Male Trey or Female model)
            const nx = Math.min(1.0, Math.abs(dx) / (torsoRx || 1));
            const nz = Math.max(0.0, Math.abs(dz) / (torsoRz || 1));
            const phi = Math.atan2(nx, Math.max(1e-4, nz));
            const normPhi = phi / (Math.PI / 2);

            // Blended mapping: On front chest (nz ~ 1), w ~ 0.9 -> pure 1:1 orthographic scale!
            // On flank (nz -> 0), w -> 0 -> pure conformal arc-length!
            const w = (nz * nz) / (nx * nx + nz * nz + 1e-5);
            const tHoriz = Math.min(1.0, Math.max(0.0, w * nx + (1 - w) * normPhi));
            const sign = dx >= 0 ? 1.0 : -1.0;

            if (!isBack) {
                u = 0.50 + sign * tHoriz * uHalf;
            } else {
                u = 0.50 - sign * tHoriz * uHalf;
            }
        } else {
            // Regular T-Shirt with Sleeves
            if (Math.abs(dx) <= torsoRx * 1.15) {
                const nx = Math.min(1.0, Math.abs(dx) / (torsoRx || 1));
                const nz = Math.max(0.0, Math.abs(dz) / (torsoRz || 1));
                const phi = Math.atan2(nx, Math.max(1e-4, nz));
                const normPhi = phi / (Math.PI / 2);
                const w = (nz * nz) / (nx * nx + nz * nz + 1e-5);
                const tHoriz = Math.min(1.0, Math.max(0.0, w * nx + (1 - w) * normPhi));
                const sign = dx >= 0 ? 1.0 : -1.0;

                if (!isBack) {
                    u = 0.50 + sign * tHoriz * uHalf;
                } else {
                    u = 0.50 - sign * tHoriz * uHalf;
                }
            } else {
                if (dx > 0) {
                    const sleeveT = Math.min(1.0, Math.max(0.0, (dx - torsoRx) / ((maxX - torsoRx) || 1)));
                    u = (!isBack) ? (0.72 + sleeveT * 0.25) : (0.28 - sleeveT * 0.25);
                } else {
                    const sleeveT = Math.min(1.0, Math.max(0.0, (-dx - torsoRx) / ((-minX - torsoRx) || 1)));
                    u = (!isBack) ? (0.28 - sleeveT * 0.25) : (0.72 + sleeveT * 0.25);
                }
            }
        }

        // Clamp U, V to safe bounds
        u = Math.max(0.01, Math.min(0.99, u));
        v = Math.max(0.01, Math.min(0.99, v));

        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
}

// Backwards-compatibility alias
function applyCleanPlanarUVs(geometry, isBack = false, customBBox = null, customCenterZ = null) {
    applyTorsoConformalUVs(geometry, isBack, customBBox, customCenterZ);
}

/**
 * Splits a unified torso/jersey mesh into distinct front and back halves along the coronal Z-plane.
 * Computes the triangle-center median Z value to produce an exact 50/50 split without seam tears,
 * correctly separating sleeves and torso for planar texture projection.
 *
 * @param {THREE.Mesh} originalMesh - The source jersey mesh from GLTF loader
 * @returns {{ frontMesh: THREE.Mesh, backMesh: THREE.Mesh }}
 */
function splitTorsoGeometry(originalMesh) {
    const origGeom = originalMesh.geometry.clone();
    origGeom.computeVertexNormals();
    origGeom.computeBoundingBox();
    const bbox = origGeom.boundingBox;

    const nonIndexed = origGeom.toNonIndexed();
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;
    const vertCount = pos.count;

    // Determine center Z by sorting triangle center Z's to get true median Z
    // This ensures a balanced coronal split for both sleeveless tank tops and sleeved T-shirts
    const zList = [];
    for (let i = 0; i < vertCount; i += 3) {
        zList.push((pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
    }
    zList.sort((a, b) => a - b);
    const medianZ = zList[Math.floor(zList.length / 2)];
    const centerZ = (medianZ !== undefined && !isNaN(medianZ)) ? medianZ : (bbox.min.z + bbox.max.z) / 2;

    const frontPositions = [];
    const frontNormals = [];
    const backPositions = [];
    const backNormals = [];

    for (let i = 0; i < vertCount; i += 3) {
        const z0 = pos.getZ(i);
        const z1 = pos.getZ(i + 1);
        const z2 = pos.getZ(i + 2);
        const avgZ = (z0 + z1 + z2) / 3;

        // Clean planar split along coronal Z plane eliminates noisy normal-based zigzag tearing
        const isFront = avgZ >= centerZ;
        const targetPos = isFront ? frontPositions : backPositions;
        const targetNorm = isFront ? frontNormals : backNormals;

        for (let j = 0; j < 3; j++) {
            const idx = i + j;
            targetPos.push(pos.getX(idx), pos.getY(idx), pos.getZ(idx));
            targetNorm.push(norm.getX(idx), norm.getY(idx), norm.getZ(idx));
        }
    }

    const landmarks = computeJerseyLandmarks(origGeom, bbox, centerZ);

    // Build Front Geometry
    const frontGeom = new THREE.BufferGeometry();
    frontGeom.setAttribute('position', new THREE.Float32BufferAttribute(frontPositions, 3));
    frontGeom.setAttribute('normal', new THREE.Float32BufferAttribute(frontNormals, 3));
    applyTorsoConformalUVs(frontGeom, false, bbox, centerZ, landmarks);

    // Build Back Geometry
    const backGeom = new THREE.BufferGeometry();
    backGeom.setAttribute('position', new THREE.Float32BufferAttribute(backPositions, 3));
    backGeom.setAttribute('normal', new THREE.Float32BufferAttribute(backNormals, 3));
    applyTorsoConformalUVs(backGeom, true, bbox, centerZ, landmarks);

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

/**
 * Conformal Arc-Length Cylindrical Shorts Unwrapping.
 * 
 * Parameterizes UVs proportionally to circumferential surface arc-length around
 * the pelvis and thighs ellipse. Perfectly aligns with 2D shorts front/back silhouettes
 * and side seams with 1-to-1 fidelity.
 *
 * @param {THREE.BufferGeometry} geometry - Target shorts mesh geometry
 * @param {boolean} isBack - True for back half, false for front half
 * @param {THREE.Box3} [customBBox] - Optional bounding box of the shorts
 * @param {number} [customCenterZ] - Coronal split plane Z coordinate
 */
function applyShortsConformalUVs(geometry, isBack = false, customBBox = null, customCenterZ = null) {
    if (!geometry) return;
    if (!customBBox) {
        geometry.computeBoundingBox();
    }
    const bbox = customBBox || geometry.boundingBox;

    const posAttr = geometry.attributes.position;
    if (!posAttr) return;

    const minX = bbox.min.x, maxX = bbox.max.x;
    const minY = bbox.min.y, maxY = bbox.max.y;
    const minZ = bbox.min.z, maxZ = bbox.max.z;

    const rangeX = (maxX - minX) || 1;
    const rangeY = (maxY - minY) || 1;
    const rangeZ = (maxZ - minZ) || 1;

    const centerX = (minX + maxX) / 2;
    const centerZ = (customCenterZ !== null && customCenterZ !== undefined && !isNaN(customCenterZ))
        ? customCenterZ
        : (minZ + maxZ) / 2;

    const rx = rangeX / 2;
    const rz = rangeZ / 2;

    // Calibrated to 2D shorts polygon: waist Y = 72..84 -> V = 0.86, hem Y = 460..470 -> V = 0.09
    const vWaistband = 0.86;
    const vHem = 0.09;
    // Calibrated to 2D shorts outer contour: X = 102..410 -> uHalf = 0.30
    const uHalf = 0.30;

    const uvs = new Float32Array(posAttr.count * 2);

    for (let i = 0; i < posAttr.count; i++) {
        const x = posAttr.getX(i);
        const y = posAttr.getY(i);
        const z = posAttr.getZ(i);

        const tY = Math.min(1.0, Math.max(0.0, (y - minY) / rangeY));
        let v = vHem + tY * (vWaistband - vHem);

        const dx = x - centerX;
        const dz = z - centerZ;

        const nx = Math.min(1.0, Math.abs(dx) / (rx || 1));
        const nz = Math.max(0.0, Math.abs(dz) / (rz || 1));
        const phi = Math.atan2(nx, Math.max(1e-4, nz));
        const normPhi = phi / (Math.PI / 2);

        const w = (nz * nz) / (nx * nx + nz * nz + 1e-5);
        const tHoriz = Math.min(1.0, Math.max(0.0, w * nx + (1 - w) * normPhi));
        const sign = dx >= 0 ? 1.0 : -1.0;

        let u;
        if (!isBack) {
            u = 0.50 + sign * tHoriz * uHalf;
        } else {
            u = 0.50 - sign * tHoriz * uHalf;
        }

        u = Math.max(0.01, Math.min(0.99, u));
        v = Math.max(0.01, Math.min(0.99, v));

        uvs[i * 2] = u;
        uvs[i * 2 + 1] = v;
    }

    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geometry.attributes.uv.needsUpdate = true;
}

/**
 * Splits shorts mesh into distinct front and back halves along the coronal Z-plane.
 * Computes median Z value to produce a balanced 50/50 split without seam tears,
 * correctly preparing the shorts for front and back texture mapping.
 *
 * @param {THREE.Mesh} originalMesh - The source shorts mesh from GLTF loader
 * @returns {{ frontMesh: THREE.Mesh, backMesh: THREE.Mesh }}
 */
function splitShortsGeometry(originalMesh) {
    const origGeom = originalMesh.geometry.clone();
    origGeom.computeVertexNormals();
    origGeom.computeBoundingBox();
    const bbox = origGeom.boundingBox;

    const nonIndexed = origGeom.toNonIndexed();
    const pos = nonIndexed.attributes.position;
    const norm = nonIndexed.attributes.normal;
    const vertCount = pos.count;

    const zList = [];
    for (let i = 0; i < vertCount; i += 3) {
        zList.push((pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3);
    }
    zList.sort((a, b) => a - b);
    const medianZ = zList[Math.floor(zList.length / 2)];
    const centerZ = (medianZ !== undefined && !isNaN(medianZ)) ? medianZ : (bbox.min.z + bbox.max.z) / 2;

    const frontPositions = [];
    const frontNormals = [];
    const backPositions = [];
    const backNormals = [];

    for (let i = 0; i < vertCount; i += 3) {
        const z0 = pos.getZ(i);
        const z1 = pos.getZ(i + 1);
        const z2 = pos.getZ(i + 2);
        const avgZ = (z0 + z1 + z2) / 3;

        const isFront = avgZ >= centerZ;
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
    applyShortsConformalUVs(frontGeom, false, bbox, centerZ);

    // Build Back Geometry
    const backGeom = new THREE.BufferGeometry();
    backGeom.setAttribute('position', new THREE.Float32BufferAttribute(backPositions, 3));
    backGeom.setAttribute('normal', new THREE.Float32BufferAttribute(backNormals, 3));
    applyShortsConformalUVs(backGeom, true, bbox, centerZ);

    const frontMesh = new THREE.Mesh(frontGeom, cleanMaterial('#7C3AED'));
    frontMesh.name = 'shorts_front';
    frontMesh.position.copy(originalMesh.position);
    frontMesh.rotation.copy(originalMesh.rotation);
    frontMesh.scale.copy(originalMesh.scale);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;

    const backMesh = new THREE.Mesh(backGeom, cleanMaterial('#7C3AED'));
    backMesh.name = 'shorts_back';
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

function sanitizeClipInPlace(clip) {
    const newTracks = [];
    clip.tracks.forEach(track => {
        // Only zero out horizontal drift on the Root bone itself
        // Track names are like "Root.position" — only lock X/Z on the root
        const trackNameLower = track.name.toLowerCase();
        const isRootPosition = trackNameLower.includes('.position') && 
            (trackNameLower.startsWith('root') || trackNameLower.includes('root.'));
        
        if (isRootPosition) {
            const values = track.values.slice();
            const startX = values[0];
            const startZ = values[2];
            for (let i = 0; i < values.length; i += 3) {
                values[i] = values[i] - startX;         // Lock X to origin
                values[i + 2] = values[i + 2] - startZ; // Lock Z to origin
            }
            const clone = track.clone();
            clone.values = values;
            newTracks.push(clone);
        } else {
            newTracks.push(track);
        }
    });
    return new THREE.AnimationClip(clip.name, clip.duration, newTracks);
}

export function fitCameraToObject(cam = camera, ctrl = controls, obj = jerseyGroup, paddingFactor = 1.9) {
    if (!cam || !ctrl) return;

    ctrl.target.set(0, 0.05, 0);
    cam.position.set(0, 0.1, 3.8);
    cam.lookAt(ctrl.target);

    cam.near = 0.05;
    cam.far = 100;
    cam.updateProjectionMatrix();

    ctrl.minDistance = 1.2;
    ctrl.maxDistance = 8.0;
    ctrl.update();
}

export function setCameraAngle(angleName) {
    if (!camera || !controls) return;
    const target = controls.target || new THREE.Vector3(0, 0.05, 0);
    const dist = 3.8;
    const y = 0.1;

    if (angleName === 'left' || angleName === 'left_side') {
        camera.position.set(-dist, y, 0);
    } else if (angleName === 'right' || angleName === 'right_side') {
        camera.position.set(dist, y, 0);
    } else if (angleName === 'back') {
        camera.position.set(0, y, -dist);
    } else {
        // default 'front'
        camera.position.set(0, y, dist);
    }

    camera.lookAt(target);
    controls.update();
}

export function setCameraFocus(focusName) {
    if (!camera || !controls) return;
    const currentAngle = camera.position.clone().sub(controls.target);
    const angle = Math.atan2(currentAngle.x, currentAngle.z);

    if (focusName === 'shorts') {
        controls.target.set(0, -0.32, 0);
        camera.position.set(Math.sin(angle) * 2.3, -0.28, Math.cos(angle) * 2.3);
    } else if (focusName === 'jersey') {
        controls.target.set(0, 0.35, 0);
        camera.position.set(Math.sin(angle) * 2.3, 0.38, Math.cos(angle) * 2.3);
    } else {
        // 'full'
        controls.target.set(0, 0.05, 0);
        camera.position.set(Math.sin(angle) * 3.8, 0.1, Math.cos(angle) * 3.8);
    }
    controls.update();
}

let showcaseTimeout = null;

/**
 * Smoothly spins the 3D model 360 degrees to showcase new AI designs.
 * Stops automatically after durationMs or immediately if the user touches/drags the view.
 *
 * @param {number} durationMs - Duration of the showcase turntable spin in milliseconds
 */
export function triggerShowcaseSpin(durationMs = 2800) {
    if (!controls || !camera) return;
    if (showcaseTimeout) {
        clearTimeout(showcaseTimeout);
        showcaseTimeout = null;
    }

    controls.autoRotate = true;
    controls.autoRotateSpeed = 4.8;

    const stopSpinOnInteraction = () => {
        if (controls) {
            controls.autoRotate = false;
            controls.removeEventListener('start', stopSpinOnInteraction);
        }
        if (showcaseTimeout) {
            clearTimeout(showcaseTimeout);
            showcaseTimeout = null;
        }
    };

    controls.addEventListener('start', stopSpinOnInteraction);

    showcaseTimeout = setTimeout(() => {
        if (controls) {
            controls.autoRotate = false;
            controls.removeEventListener('start', stopSpinOnInteraction);
        }
        showcaseTimeout = null;
    }, durationMs);
}

let currentModelType = 'sleeveless';
let currentGender = 'male';

/**
 * Loads the active 3D jersey model from static/assets/models/{male|female}/.
 * Performs clean resource disposal on the previous model to prevent WebGL memory leaks,
 * then maps mesh segmentation (mannequin body, jersey torso, shorts, shoes, hair).
 *
 * Supported silhouette styles:
 *  - 'sleeveless': Athletic basketball tank top (male/trey.glb or female/(Female)+Sleeveless+Basketball+Jersey.glb)
 *  - 'tshirt': Regular crewneck jersey with sleeves
 *
 * @param {'sleeveless'|'tshirt'} jerseyType - Target silhouette model to load
 * @param {'male'|'female'} gender - Target mannequin gender fit
 */
export function loadJerseyModel(jerseyType = 'sleeveless', gender = currentGender) {
    currentModelType = jerseyType;
    currentGender = gender || 'male';

    let modelPath = '';
    if (currentGender === 'female') {
        modelPath = (jerseyType === 'tshirt')
            ? '/static/assets/models/female/(Female)+Regular+T-Shirt+Jersey+With+Sleeves.glb?v=' + Date.now()
            : '/static/assets/models/female/(Female)+Sleeveless+Basketball+Jersey.glb?v=' + Date.now();
    } else {
        modelPath = (jerseyType === 'tshirt')
            ? '/static/assets/models/male/Regular+T-Shirt+Jersey+With+Sleeves.glb?v=' + Date.now()
            : '/static/assets/models/male/trey.glb?v=' + Date.now();
    }
    tryLoadGLB(modelPath);
}

function tryLoadGLB(path) {
    const loader = new GLTFLoader();
    showLoadingUI(true);

    if (jerseyGroup) {
        scene.remove(jerseyGroup);
        jerseyGroup.traverse((child) => {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                else child.material.dispose();
            }
        });
        jerseyGroup = null;
        meshParts = {};
    }

    loader.load(
        path,
        (gltf) => {
            console.log('GLB loaded successfully from:', path);
            showLoadingUI(false);

            jerseyGroup = gltf.scene;

            jerseyGroup.updateMatrixWorld(true);
            const box = new THREE.Box3().setFromObject(jerseyGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 2.0 / (size.y || maxDim || 1);

            jerseyGroup.scale.setScalar(scale);
            jerseyGroup.position.set(-center.x * scale, -box.min.y * scale - 0.95, -center.z * scale);

            scene.add(jerseyGroup);

            // Auto-fit camera dynamically to the loaded model
            fitCameraToObject(camera, controls, jerseyGroup, 1.9);

            // Animation loading disabled — model stays in T-pose
            console.log('Displaying static T-pose');

            const mannequinMeshes = [];
            const trimMeshes = [];
            const shoeMeshes = [];
            let shirtMeshFound = null;
            let shortsMeshFound = null;

            const allMeshes = [];
            jerseyGroup.traverse((child) => {
                if (child.isMesh || child.isSkinnedMesh) {
                    allMeshes.push(child);
                }
            });

            allMeshes.forEach((child) => {
                child.castShadow = true;
                child.receiveShadow = true;
                const name = child.name.toLowerCase().trim();
                console.log('Mesh found:', child.name, child.isSkinnedMesh ? '(Skinned)' : '');

                // Jersey / shirt / tshirt / jersey mesh
                if (name === 'jersey_front') {
                    child.material = cleanMaterial('#4F46E5');
                    applyTorsoConformalUVs(child.geometry, false);
                    meshParts['jersey_front'] = child;
                } else if (name === 'jersey_back') {
                    child.material = cleanMaterial('#4F46E5');
                    applyTorsoConformalUVs(child.geometry, true);
                    meshParts['jersey_back'] = child;
                } else if (name === 'shirt' || name === 'tshirt' || name === 'jersey' || name === 'jersey_body' || name === 'torso') {
                    shirtMeshFound = child;
                // Shorts
                } else if (name === 'short' || name === 'shorts') {
                    shortsMeshFound = child;
                // Trim pieces (neckband, armband)
                } else if (name.includes('neckband') || (name.includes('armband') && !name.includes('limb'))) {
                    child.material = cleanMaterial('#ffffff');
                    trimMeshes.push(child);
                    meshParts[child.name] = child;
                // Hair
                } else if (name === 'hair') {
                    child.material = new THREE.MeshStandardMaterial({
                        color: '#18181b',
                        roughness: 0.65,
                        metalness: 0.1
                    });
                    meshParts['hair'] = child;
                // Body / skin / head / limbs / mannequin
                } else if (name === 'head' || name === 'body' || name.includes('hand') || name.includes('leg') || name.includes('limb') || name.includes('arm') || name.includes('mannequin') || name.includes('skin') || name.includes('human')) {
                    const skin = PRESET_SKINS[currentSkinKey] || PRESET_SKINS['obsidian'];
                    child.material = new THREE.MeshStandardMaterial({
                        color: skin.color,
                        roughness: skin.roughness,
                        metalness: skin.metalness
                    });
                    mannequinMeshes.push(child);
                // Socks (standalone)
                } else if (name.includes('sock') && !name.includes('shoe')) {
                    child.material = cleanMaterial('#ffffff');
                    trimMeshes.push(child);
                    meshParts[child.name] = child;
                // Shoes (standalone) or combined "shoes and socks" or tripo_part shoe meshes
                } else if (name.includes('shoe') || name.startsWith('tripo_part')) {
                    child.material = new THREE.MeshStandardMaterial({
                        color: '#0f172a',
                        roughness: 0.6,
                        metalness: 0.3
                    });
                    shoeMeshes.push(child);
                } else {
                    const skin = PRESET_SKINS[currentSkinKey] || PRESET_SKINS['obsidian'];
                    child.material = new THREE.MeshStandardMaterial({
                        color: skin.color,
                        roughness: skin.roughness,
                        metalness: skin.metalness
                    });
                }
            });

            // If a jersey/shirt was found and needs splitting into front/back
            if (shirtMeshFound && (!meshParts['jersey_front'] || !meshParts['jersey_back'] || meshParts['jersey_front'] === shirtMeshFound)) {
                const { frontMesh, backMesh } = splitTorsoGeometry(shirtMeshFound);
                meshParts['jersey_front'] = frontMesh;
                meshParts['jersey_back'] = backMesh;
                meshParts['shirt'] = frontMesh;
                meshParts['jersey_body'] = frontMesh;
            }

            // If shorts was found and needs splitting into front/back
            if (shortsMeshFound && (!meshParts['shorts_front'] || !meshParts['shorts_back'] || meshParts['shorts_front'] === shortsMeshFound)) {
                const { frontMesh, backMesh } = splitShortsGeometry(shortsMeshFound);
                meshParts['shorts_front'] = frontMesh;
                meshParts['shorts_back'] = backMesh;
                meshParts['shorts'] = frontMesh;
            }

            meshParts['mannequin_list'] = mannequinMeshes;
            meshParts['trim_list'] = trimMeshes;
            meshParts['shoe_list'] = shoeMeshes;
            if (mannequinMeshes.length > 0) {
                meshParts['mannequin'] = mannequinMeshes[0];
            }
            setMannequinSkin(currentSkinKey);

            console.log('Mapped parts:', Object.keys(meshParts));

            if (Object.keys(meshParts).length === 0) {
                jerseyGroup.traverse((child) => {
                    if (child.isMesh || child.isSkinnedMesh) {
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
            console.warn('GLB failed to load from ' + path + ', trying fallback:', error);
            showLoadingUI(false);
            if (currentGender === 'female' && currentModelType === 'tshirt') {
                loadJerseyModel('sleeveless', 'female');
            } else if (currentModelType === 'tshirt') {
                loadJerseyModel('sleeveless', 'male');
            } else if (!path.includes('trey.glb')) {
                tryLoadGLB('/static/assets/models/male/trey.glb?v=' + Date.now());
            }
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
    if (partName === 'shorts') {
        ['shorts_front', 'shorts_back', 'shorts'].forEach(name => {
            if (meshParts[name] && meshParts[name].material) {
                const targetColor = meshParts[name].material.map ? '#ffffff' : color;
                meshParts[name].material.color.set(targetColor);
                meshParts[name].material.needsUpdate = true;
            }
        });
    }
    if (meshParts[partName] && meshParts[partName].material) {
        // If the mesh already has a texture map, maintain white color so the texture colors don't get multiplied/darkened
        const targetColor = meshParts[partName].material.map ? '#ffffff' : color;
        meshParts[partName].material.color.set(targetColor);
        meshParts[partName].material.needsUpdate = true;
    }
}

export function setMannequinSkin(skinKey) {
    if (!PRESET_SKINS[skinKey]) return;
    currentSkinKey = skinKey;
    const skin = PRESET_SKINS[skinKey];

    const applySkin = (mesh) => {
        if (!mesh || !mesh.material) return;
        mesh.material.color.set(skin.color);
        mesh.material.roughness = skin.roughness;
        mesh.material.metalness = skin.metalness;
        mesh.material.needsUpdate = true;
    };

    if (meshParts['mannequin_list']) {
        meshParts['mannequin_list'].forEach(applySkin);
    }
    if (meshParts['mannequin']) {
        applySkin(meshParts['mannequin']);
    }
}

export function getCurrentMannequinSkin() {
    return currentSkinKey;
}

export function setMannequinColor(color) {
    if (PRESET_SKINS[color]) {
        setMannequinSkin(color);
        return;
    }
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
        if (THREE.SRGBColorSpace) {
            cachedTrimTexture.colorSpace = THREE.SRGBColorSpace;
        }
        cachedTrimTexture.wrapS = THREE.RepeatWrapping;
        cachedTrimTexture.wrapT = THREE.RepeatWrapping;
        cachedTrimTexture.repeat.set(8, 1);
    } else {
        if (THREE.SRGBColorSpace) {
            cachedTrimTexture.colorSpace = THREE.SRGBColorSpace;
        }
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
        meshParts['jersey_front'].material.color.set('#ffffff');
        meshParts['jersey_front'].material.map = canvasTexture;
        meshParts['jersey_front'].material.needsUpdate = true;
    }
}

export function applyTextureToBack(canvasTexture) {
    if (meshParts['jersey_back']) {
        meshParts['jersey_back'].material.color.set('#ffffff');
        meshParts['jersey_back'].material.map = canvasTexture;
        meshParts['jersey_back'].material.needsUpdate = true;
    }
}

export function applyTextureToShortsFront(canvasTexture) {
    if (meshParts['shorts_front']) {
        meshParts['shorts_front'].material.color.set('#ffffff');
        meshParts['shorts_front'].material.map = canvasTexture;
        meshParts['shorts_front'].material.needsUpdate = true;
    } else if (meshParts['shorts']) {
        meshParts['shorts'].material.color.set('#ffffff');
        meshParts['shorts'].material.map = canvasTexture;
        meshParts['shorts'].material.needsUpdate = true;
    }
}

export function applyTextureToShortsBack(canvasTexture) {
    if (meshParts['shorts_back']) {
        meshParts['shorts_back'].material.color.set('#ffffff');
        meshParts['shorts_back'].material.map = canvasTexture;
        meshParts['shorts_back'].material.needsUpdate = true;
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
    let roughness = 0.55;
    let metalness = 0.0;
    let clearcoat = 0.05;
    let clearcoatRoughness = 0.1;
    let activeBumpMap = fabricBumpTexture;
    let bumpScale = 0.005;

    if (finishName === 'matte') {
        roughness = 0.7;
        metalness = 0.0;
        clearcoat = 0.0;
        bumpScale = 0.006;
    } else if (finishName === 'satin') {
        roughness = 0.3;
        metalness = 0.05;
        clearcoat = 0.5;
        clearcoatRoughness = 0.15;
        bumpScale = 0.004;
    } else if (finishName === 'metallic') {
        // High sheen athletic finish with clearcoat; maintains vibrant colors without turning dark
        roughness = 0.22;
        metalness = 0.18;
        clearcoat = 0.8;
        clearcoatRoughness = 0.08;
        bumpScale = 0.003;
    } else if (finishName === 'carbon') {
        roughness = 0.4;
        metalness = 0.15;
        clearcoat = 0.25;
        activeBumpMap = carbonBumpTexture;
        bumpScale = 0.018;
    }

    const targetMeshes = ['jersey_front', 'jersey_back', 'jersey_body', 'shorts', 'shorts_front', 'shorts_back', 'sleeve_left', 'sleeve_right'];
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
            mesh.material.bumpScale = (name === 'shorts' || name.startsWith('shorts')) ? Math.min(bumpScale, 0.003) : bumpScale;
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
        ambientLight.intensity = 1.6;

        dirLight.color.set(0xffffff);
        dirLight.intensity = 1.8;

        fillLight.color.set(0x00ffff);
        fillLight.intensity = 0.6;
        fillLight.position.set(-5, 2, 4);

        backLight.color.set(0xff007f);
        backLight.intensity = 0.6;
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

// Animation functions disabled — T-pose only
export function playAnimation(name, duration = 0.5) { /* no-op */ }
export function getAvailableAnimations() { return []; }
export function getCurrentAnimation() { return 't-pose'; }

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    // mixer.update(delta); — disabled, T-pose only
    controls.update();
    renderer.render(scene, camera);
}