import * as THREE from 'three';

export class ThreeScene {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.currentSection = 0;

        // Navigation targets: Different views of the ship
        this.cameraTargets = [
            { pos: new THREE.Vector3(0, 0, 40), rot: new THREE.Vector3(0, 0, 0) }, // Front View
            { pos: new THREE.Vector3(-30, 10, 20), rot: new THREE.Vector3(-0.3, 0.8, 0.1) }, // Side Detail
            { pos: new THREE.Vector3(0, 5, 10), rot: new THREE.Vector3(-0.2, 0, 0) }, // Engine/Bridge Close-up
            { pos: new THREE.Vector3(0, 50, 0), rot: new THREE.Vector3(-1.57, 0, 0) }, // Top Down
        ];

        this.init();
        this.animate();
        this.handleResize();
    }

    init() {
        // Deep Space Background
        this.scene.background = new THREE.Color(0x010103);

        // Ambient Light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambientLight);

        // Key Light (The Sun / Star)
        const sunLight = new THREE.DirectionalLight(0xffffff, 2);
        sunLight.position.set(50, 50, 50);
        this.scene.add(sunLight);

        // Procedural Starfield
        this.createStars();

        // The Spaceship
        this.ship = new THREE.Group();
        this.createShip();
        this.scene.add(this.ship);

        // Initial Camera position
        this.camera.position.copy(this.cameraTargets[0].pos);
    }

    createStars() {
        const starGeo = new THREE.BufferGeometry();
        const starCount = 5000;
        const posArray = new Float32Array(starCount * 3);
        const colorArray = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 1500;
            colorArray[i] = 0.5 + Math.random() * 0.5;
        }

        starGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        starGeo.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

        const starMat = new THREE.PointsMaterial({
            size: 1.5,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeo, starMat);
        this.scene.add(stars);
    }

    createShip() {
        // Main Hull (Long hexagonal body)
        const hullGeo = new THREE.CylinderGeometry(5, 5, 25, 6);
        const hullMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.4,
            metalness: 0.9,
            flatShading: true
        });
        const hull = new THREE.Mesh(hullGeo, hullMat);
        hull.rotation.x = Math.PI / 2;
        this.ship.add(hull);

        // Command Bridge (The "Head")
        const bridgeGeo = new THREE.SphereGeometry(4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x050505, glass: true, opacity: 0.5, transparent: true });
        const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridge.position.z = 15;
        bridge.rotation.x = -Math.PI / 2;
        this.ship.add(bridge);

        // Inner Bridge Detail
        const bridgeDetailGeo = new THREE.BoxGeometry(2, 1, 2);
        const bridgeDetailMat = new THREE.MeshStandardMaterial({ color: 0x00f2ff, emissive: 0x00f2ff, emissiveIntensity: 2 });
        const innerBridge = new THREE.Mesh(bridgeDetailGeo, bridgeDetailMat);
        innerBridge.position.z = 14;
        this.ship.add(innerBridge);

        // Engine Array (The "Tail")
        const engineMountGeo = new THREE.BoxGeometry(10, 10, 2);
        const engineMount = new THREE.Mesh(engineMountGeo, hullMat);
        engineMount.position.z = -13;
        this.ship.add(engineMount);

        for (let x = -1; x <= 1; x += 2) {
            for (let y = -1; y <= 1; y += 2) {
                const engineGeo = new THREE.CylinderGeometry(1.5, 2.5, 4, 16);
                const engine = new THREE.Mesh(engineGeo, hullMat);
                engine.position.set(x * 3, y * 3, -15);
                engine.rotation.x = Math.PI / 2;
                this.ship.add(engine);

                // Engine Glow
                const glowGeo = new THREE.CircleGeometry(1.2, 16);
                const glowMat = new THREE.MeshBasicMaterial({ color: 0x00f2ff });
                const glow = new THREE.Mesh(glowGeo, glowMat);
                glow.position.set(x * 3, y * 3, -17.1);
                glow.rotation.y = Math.PI;
                this.ship.add(glow);

                // Engine Light
                const engineLight = new THREE.PointLight(0x00f2ff, 10, 20);
                engineLight.position.set(x * 3, y * 3, -18);
                this.ship.add(engineLight);
            }
        }

        // Side Panels / Solar Arrays
        const panelGeo = new THREE.BoxGeometry(1, 15, 30);
        const panelMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.5 });

        for (let side = -1; side <= 1; side += 2) {
            const panelGroup = new THREE.Group();
            const panel = new THREE.Mesh(panelGeo, panelMat);
            panel.position.x = side * 12;
            panelGroup.add(panel);

            // Add grid details to panels
            const grid = new THREE.GridHelper(30, 10, 0x00f2ff, 0x000000);
            grid.rotation.x = Math.PI / 2;
            grid.rotation.z = Math.PI / 2;
            grid.position.x = side * 12.6;
            this.ship.add(grid);

            this.ship.add(panelGroup);
        }

        // Greebles (Detailed bumps)
        for (let i = 0; i < 50; i++) {
            const size = 0.5 + Math.random();
            const greebleGeo = new THREE.BoxGeometry(size, size, size);
            const greeble = new THREE.Mesh(greebleGeo, hullMat);

            const angle = Math.random() * Math.PI * 2;
            const radius = 5;
            greeble.position.set(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius,
                (Math.random() - 0.5) * 20
            );
            this.ship.add(greeble);
        }
    }

    setSection(index) {
        this.currentSection = index;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const delta = this.clock.getDelta();
        const elapsed = this.clock.getElapsedTime();

        // Ship Motion
        if (this.ship) {
            this.ship.rotation.z = Math.sin(elapsed * 0.2) * 0.1;
            this.ship.position.y = Math.sin(elapsed * 0.5) * 0.5;
        }

        // Camera Transition (Slightly slower for space feel)
        const target = this.cameraTargets[this.currentSection];
        this.camera.position.lerp(target.pos, 0.03);

        this.camera.rotation.x += (target.rot.x - this.camera.rotation.x) * 0.03;
        this.camera.rotation.y += (target.rot.y - this.camera.rotation.y) * 0.03;
        this.camera.rotation.z += (target.rot.z - this.camera.rotation.z) * 0.03;

        this.renderer.render(this.scene, this.camera);
    }

    handleResize() {
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}
