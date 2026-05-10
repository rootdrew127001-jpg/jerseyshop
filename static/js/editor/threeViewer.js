import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let scene, camera, renderer, controls;
let meshParts = {};
let jerseyGroup = null;

export function initViewer(canvasId) {
    const canvas = document.getElementById(canvasId);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e293b');

    // Camera
    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 1, 4);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = false;

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 3.0);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
    backLight.position.set(0, -5, -5);
    scene.add(backLight);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 8;
    controls.target.set(0, 0, 0);

    tryLoadGLB('/static/assets/models/jersey.glb');

    // Resize
    window.addEventListener('resize', () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    animate();
}
const cleanMaterial = (color) => {
    const mat = new THREE.MeshStandardMaterial({
        color: color,
        roughness: 1.0,
        metalness: 0.0,
        side: THREE.FrontSide,
        vertexColors: false
    });
    mat.map = null;
    mat.normalMap = null;
    mat.roughnessMap = null;
    mat.metalnessMap = null;
    mat.aoMap = null;
    mat.emissiveMap = null;
    mat.envMap = null;
    mat.alphaMap = null;
    mat.bumpMap = null;
    mat.displacementMap = null;
    mat.lightMap = null;
    mat.needsUpdate = true;
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
            const scale = 2.5 / maxDim;

            jerseyGroup.scale.setScalar(scale);
            jerseyGroup.position.sub(center.multiplyScalar(scale));

            scene.add(jerseyGroup);

            jerseyGroup.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    const name = child.name.toLowerCase();
                    console.log('Mesh found:', child.name);

            if (name === 'jersey_front' || name.includes('jersey_front')) {
                child.material = cleanMaterial('#4F46E5');
                if (child.geometry.attributes.color) {
                    delete child.geometry.attributes.color;
                    child.geometry.needsUpdate = true;
                }
                meshParts['jersey_front'] = child;
            } else if (name === 'jersey_back' || name.includes('jersey_back')) {
                child.material = cleanMaterial('#4F46E5');
                if (child.geometry.attributes.color) {
                    delete child.geometry.attributes.color;
                    child.geometry.needsUpdate = true;
                }
                meshParts['jersey_back'] = child;
            } else if (name === 'jersey_body' || name.includes('jersey_body')) {
                child.material = cleanMaterial('#4F46E5');
                if (child.geometry.attributes.color) {
                    delete child.geometry.attributes.color;
                    child.geometry.needsUpdate = true;
                }
                meshParts['jersey_body'] = child;
            } else if (name === 'shorts' || name.includes('shorts')) {
                child.material = cleanMaterial('#7C3AED');
                if (child.geometry.attributes.color) {
                    delete child.geometry.attributes.color;
                    child.geometry.needsUpdate = true;
                }
                meshParts['shorts'] = child;
            } else if (name === 'body_mannequin' || name.includes('mannequin')) {
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

            console.log('Mapped parts:', Object.keys(meshParts));
        },
        (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            updateLoadingProgress(percent);
        },
        (error) => {
            console.warn('GLB not found, using placeholder:', error);
            showLoadingUI(false);
            buildPlaceholderJersey();
        }
    );
}


function buildPlaceholderJersey() {
    jerseyGroup = new THREE.Group();

    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.5, 0.3),
        new THREE.MeshStandardMaterial({ color: '#4F46E5' })
    );
    jerseyGroup.add(body);
    meshParts['body'] = body;

    const sleeveMat = new THREE.MeshStandardMaterial({ color: '#7C3AED' });

    const leftSleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.28),
        sleeveMat.clone()
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

    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true })
    );
    panel.position.set(0, 0.05, 0.16);
    jerseyGroup.add(panel);
    meshParts['panel'] = panel;

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

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}