import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let scene, camera, renderer, controls;
let meshParts = {};

export function initViewer(canvasId) {
    const canvas = document.getElementById(canvasId);

    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e293b');

    camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, 1, 4);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);

    const ambient = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.5);
    fillLight.position.set(-5, 0, -5);
    scene.add(fillLight);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 8;

    buildPlaceholderJersey();

    window.addEventListener('resize', () => {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });

    animate();
}

function buildPlaceholderJersey() {
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.5, 0.3),
        new THREE.MeshStandardMaterial({ color: '#4F46E5' })
    );
    scene.add(body);
    meshParts['body'] = body;

    const sleeveMat = new THREE.MeshStandardMaterial({ color: '#7C3AED' });

    const leftSleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.28),
        sleeveMat.clone()
    );
    leftSleeve.position.set(-0.85, 0.55, 0);
    scene.add(leftSleeve);
    meshParts['sleeve_left'] = leftSleeve;

    const rightSleeve = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.4, 0.28),
        sleeveMat.clone()
    );
    rightSleeve.position.set(0.85, 0.55, 0);
    scene.add(rightSleeve);
    meshParts['sleeve_right'] = rightSleeve;

    const collar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.22, 0.12, 32, 1, true),
        new THREE.MeshStandardMaterial({ color: '#1E1B4B', side: THREE.DoubleSide })
    );
    collar.position.set(0, 0.82, 0);
    scene.add(collar);
    meshParts['collar'] = collar;

    const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true })
    );
    panel.position.set(0, 0.05, 0.16);
    scene.add(panel);
    meshParts['panel'] = panel;
}

export function setPartColor(partName, color) {
    if (meshParts[partName]) {
        meshParts[partName].material.color.set(color);
    }
}

export function applyTextureToPanel(canvasTexture) {
    if (meshParts['panel']) {
        meshParts['panel'].material.map = canvasTexture;
        meshParts['panel'].material.needsUpdate = true;
    }
}

export function getMeshParts() {
    return meshParts;
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}