import * as THREE from 'three';

export class SpaceScene {
    constructor(container) {
        this.container = container;
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.6;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.container.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0, 0);
        this.smoothMouse = new THREE.Vector2(0, 0);

        this.screens = [];
        this.hudCanvases = [];
        this.blinkLights = [];

        // Movement State
        this.keys = { forward: false, backward: false, left: false, right: false };
        this.velocity = new THREE.Vector3();
        this.playerRotation = 0;
        this.speed = 0.12;
        this.turnSpeed = 0.045;
        this.bounds = { x: 0.2, zMin: -5, zMax: 10 }; // Path locked (narrow X)

        // Sitting & Interaction State
        this.isSitting = false;
        this.isExteriorView = false;
        this.seats = [];
        this.seatClickTargets = [];
        this.nearbySeat = null;
        this.sitPrompt = document.getElementById('sit-prompt');
        this.raycaster = new THREE.Raycaster();
        this.clickMouse = new THREE.Vector2();

        this.init();
        this.animate();
        this.handleEvents();
    }

    init() {
        this.scene.background = new THREE.Color(0x000002);
        this.initMaterials();
        this.camera.position.set(0, 1.45, 1.2);

        this.setupLighting();
        this.createEnvironment();
        this.buildDeckGeometry();
        this.buildDetailedWalls();
        this.buildTripleWindowSystem();
        this.buildHyperDetailedDashboard();
        this.buildHighFidelitySeats();
        this.buildControlGears();
        this.buildCeilingModules();
        this.buildExteriorHull();
    }

    initMaterials() {
        const canvas = document.createElement('canvas');
        canvas.width = 128; canvas.height = 128;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#cc5500'; ctx.fillRect(0, 0, 128, 128);
        ctx.strokeStyle = '#993300'; ctx.lineWidth = 2;
        for (let i = 0; i < 128; i += 16) {
            for (let j = 0; j < 128; j += 16) {
                ctx.strokeRect(i, j, 16, 16);
            }
        }
        const seatTexture = new THREE.CanvasTexture(canvas);
        seatTexture.wrapS = seatTexture.wrapT = THREE.RepeatWrapping;
        seatTexture.repeat.set(4, 8);

        this.matteMetal = new THREE.MeshPhysicalMaterial({
            color: 0xfafafa, metalness: 0.1, roughness: 0.2, clearcoat: 0.5
        });
        this.brushedAlum = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.8, roughness: 0.1, clearcoat: 1.0
        });
        this.titaniumPro = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, metalness: 0.3, roughness: 0.1, clearcoat: 1.0
        });
        this.cyanGlow = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        this.guardMat = new THREE.MeshPhysicalMaterial({
            color: 0x00ffff, transparent: true, opacity: 0.3, transmission: 0.9, roughness: 0.1
        });
        this.glassMat = new THREE.MeshPhysicalMaterial({
            color: 0xffffff, transparent: true, opacity: 0.05, transmission: 0.95, roughness: 0, thickness: 0.5, ior: 1.5
        });

        // 5. EXTERIOR INDUSTRIAL HULL TEXTURE
        const hullC = document.createElement('canvas');
        hullC.width = 512; hullC.height = 512;
        const hCtx = hullC.getContext('2d');
        hCtx.fillStyle = '#111111'; hCtx.fillRect(0, 0, 512, 512);
        hCtx.strokeStyle = '#333333'; hCtx.lineWidth = 4;
        for (let i = 0; i < 512; i += 64) {
            hCtx.beginPath(); hCtx.moveTo(i, 0); hCtx.lineTo(i, 512); hCtx.stroke();
            hCtx.beginPath(); hCtx.moveTo(0, i); hCtx.lineTo(512, i); hCtx.stroke();
            // Rivets
            hCtx.fillStyle = '#222222';
            for (let j = 0; j < 512; j += 64) hCtx.fillRect(i + 4, j + 4, 4, 4);
        }
        const hTex = new THREE.CanvasTexture(hullC);
        hTex.wrapS = hTex.wrapT = THREE.RepeatWrapping;
        hTex.repeat.set(2, 4);

        this.extHullMat = new THREE.MeshPhysicalMaterial({
            color: 0x222222, map: hTex, metalness: 0.9, roughness: 0.4, clearcoat: 0.1
        });
    }

    setupLighting() {
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const lights = [
            { pos: [-4, 3, -1], color: 0xff6600, int: 20 },
            { pos: [4, 3, -1], color: 0xff6600, int: 20 },
            { pos: [0, 1.5, -4], color: 0x00ffff, int: 10 }
        ];
        lights.forEach(l => {
            const pl = new THREE.PointLight(l.color, l.int, 15);
            pl.position.set(...l.pos);
            this.scene.add(pl);
        });
        const sun = new THREE.DirectionalLight(0xffffff, 3.5);
        sun.position.set(100, 100, -500);
        this.scene.add(sun);
    }

    createEnvironment() {
        const starGeo = new THREE.BufferGeometry();
        const count = 15000;
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const r = 4000 + Math.random() * 2000;
            const t = Math.acos(Math.random() * 2 - 1);
            const p = Math.random() * Math.PI * 2;
            pos[i * 3] = r * Math.sin(t) * Math.cos(p);
            pos[i * 3 + 1] = r * Math.sin(t) * Math.sin(p);
            pos[i * 3 + 2] = r * Math.cos(t);
        }
        starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.5 })));

        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(1500, 64, 64),
            new THREE.MeshStandardMaterial({ color: 0x112244, emissive: 0x2244aa, emissiveIntensity: 0.2 })
        );
        earth.position.set(2000, -1000, -3000);
        this.scene.add(earth);
        this.earth = earth;
    }

    buildDeckGeometry() {
        const floor = new THREE.Mesh(new THREE.BoxGeometry(15, 0.2, 25), this.matteMetal);
        floor.position.set(0, -0.5, 0);
        this.scene.add(floor);
        for (let x = -0.5; x <= 0.5; x += 1) { // Narrow path indicators
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 25), this.cyanGlow);
            line.position.set(x, -0.39, 0);
            this.scene.add(line);
        }
    }

    buildTripleWindowSystem() {
        for (let s = -1; s <= 1; s++) {
            const win = new THREE.Mesh(new THREE.PlaneGeometry(6, 5), this.glassMat);
            win.position.set(s * 6.2, 2.5, -6 + Math.abs(s) * 1.5);
            win.rotation.y = s * -0.65;
            this.scene.add(win);
            const pill = new THREE.Mesh(new THREE.BoxGeometry(0.8, 6.5, 1), this.matteMetal);
            pill.position.set(s * 3.3, 2.7, -5.8);
            this.scene.add(pill);
        }
    }

    buildDetailedWalls() {
        for (let s = -1; s <= 1; s += 2) {
            const wall = new THREE.Group();
            const wallBase = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8, 20), this.matteMetal);
            wall.add(wallBase);
            for (let i = 0; i < 8; i++) {
                const panel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 2), this.matteMetal);
                panel.position.set(0.1, (i * 1.1) - 3.5, (Math.random() - 0.5) * 12);
                wall.add(panel);
                const led = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff3300 }));
                led.position.set(0.4, panel.position.y + 0.3, panel.position.z + 0.3);
                wall.add(led);
                this.blinkLights.push(led);
            }
            wall.position.set(s * 7.5, 3.5, 0);
            this.scene.add(wall);
        }
    }

    createActiveHUD(type, color) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const texture = new THREE.CanvasTexture(canvas);
        const update = (time) => {
            ctx.clearRect(0, 0, 512, 512);
            ctx.fillStyle = 'rgba(0, 15, 30, 0.9)'; ctx.fillRect(0, 0, 512, 512);
            ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.font = 'bold 36px Courier New'; ctx.fillStyle = color;
            ctx.fillText(type + ': ACTIVE', 30, 70);
            if (type === 'NAV') {
                ctx.beginPath(); ctx.arc(256, 256, 160, 0, Math.PI * 2); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(256, 256); ctx.lineTo(256 + Math.cos(time) * 160, 256 + Math.sin(time) * 160); ctx.stroke();
            } else if (type === 'ENG') {
                for (let i = 0; i < 10; i++) {
                    const h = 100 + Math.sin(time * 4 + i) * 80;
                    ctx.fillRect(40 + i * 45, 420 - h, 30, h);
                }
            } else if (type === 'EVS') {
                ctx.fillStyle = 'rgba(0, 20, 10, 0.9)'; ctx.fillRect(0, 0, 512, 512);
                ctx.strokeStyle = '#00ff33'; ctx.lineWidth = 2;
                ctx.font = 'bold 36px Courier New'; ctx.fillStyle = '#00ff33';
                ctx.fillText('EXT-CAM-NV: ACTIVE', 30, 70);
                ctx.beginPath();
                ctx.moveTo(256, 156); ctx.lineTo(256, 356);
                ctx.moveTo(156, 256); ctx.lineTo(356, 256);
                ctx.stroke();
                for (let i = 0; i < 300; i++) {
                    ctx.fillStyle = `rgba(0, 150, 50, ${Math.random() * 0.5})`;
                    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
                }
                ctx.fillText('SENSOR-TEMP: 4K', 30, 480);
            } else {
                ctx.beginPath(); for (let i = 0; i < 20; i++) ctx.lineTo(i * 25, 256 + Math.sin(time * 6 + i) * 120); ctx.stroke();
            }
            texture.needsUpdate = true;
        };
        return { texture, update };
    }

    buildHyperDetailedDashboard() {
        const dashGroup = new THREE.Group();
        const base = new THREE.Mesh(new THREE.BoxGeometry(12, 1.4, 4), this.matteMetal);
        base.position.set(0, 0.2, -4.5);
        dashGroup.add(base);

        const controlSlope = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 2.2), this.matteMetal);
        controlSlope.position.set(0, 0.8, -3.5);
        controlSlope.rotation.x = 0.55;
        dashGroup.add(controlSlope);

        const btnColors = [0xff0000, 0x00ff00, 0xffff00, 0xcccccc];
        for (let x = -4.5; x <= 4.5; x += 0.35) {
            for (let z = -0.6; z <= 0.6; z += 0.35) {
                const btn = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.1), new THREE.MeshStandardMaterial({ color: btnColors[Math.floor(Math.random() * 4)] }));
                btn.position.set(x, 0.92, -3.5 + z);
                btn.rotation.x = 0.55;
                dashGroup.add(btn);
            }
        }

        const monitorSpecs = [
            { t: 'ENG', c: '#00ccff', x: -4.2, y: 1.6, z: -4.8, ry: 0.35, rx: -0.25, w: 2.8, h: 1.8 },
            { t: 'NAV', c: '#00ffaa', x: 0, y: 1.9, z: -5.4, ry: 0, rx: -0.15, w: 4.8, h: 3.2 },
            { t: 'SYS', c: '#ffaa00', x: 4.2, y: 1.6, z: -4.8, ry: -0.35, rx: -0.25, w: 2.8, h: 1.8 }
        ];

        monitorSpecs.forEach(spec => {
            const h = this.createActiveHUD(spec.t, spec.c);
            this.hudCanvases.push(h);
            const screen = new THREE.Mesh(new THREE.PlaneGeometry(spec.w, spec.h), new THREE.MeshBasicMaterial({ map: h.texture, transparent: true, opacity: 0.9 }));
            screen.position.set(spec.x, spec.y, spec.z);
            screen.rotation.set(spec.rx, spec.ry, 0);
            dashGroup.add(screen);
            const bezel = new THREE.Mesh(new THREE.BoxGeometry(spec.w + 0.2, spec.h + 0.2, 0.1), this.matteMetal);
            bezel.position.set(spec.x, spec.y, spec.z - 0.1);
            bezel.rotation.set(spec.rx, spec.ry, 0);
            dashGroup.add(bezel);
        });

        // PHYSICAL TOGGLE SWITCHES & DATA PORTS
        for (let x = -2; x <= 2; x += 0.5) {
            const toggleBase = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), this.brushedAlum);
            toggleBase.position.set(x, 0.75, -2.8);
            dashGroup.add(toggleBase);

            const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.15, 8), this.matteMetal);
            pin.position.set(x, 0.85, -2.8);
            pin.rotation.x = 0.4;
            dashGroup.add(pin);
        }

        // KEYPAD INTERFACES
        for (let s = -1; s <= 1; s += 2) {
            const keypad = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), this.matteMetal);
            keypad.position.set(s * 3.5, 0.72, -2.8);
            dashGroup.add(keypad);

            for (let ky = 0; ky < 3; ky++) {
                for (let kx = 0; kx < 4; kx++) {
                    const k = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.05, 0.15), new THREE.MeshStandardMaterial({ color: 0x444444 }));
                    k.position.set(s * 3.5 + (kx * 0.2 - 0.3), 0.76, -2.8 + (ky * 0.2 - 0.2));
                    dashGroup.add(k);
                }
            }
        }

        // 2. SECONDARY 'EXTERNAL VIEW' MONITORS (EVS)
        for (let x = -4.5; x <= 4.5; x += 3) {
            const evsHUD = this.createActiveHUD('EVS', '#00ff33');
            this.hudCanvases.push(evsHUD);

            const evsScreen = new THREE.Mesh(
                new THREE.PlaneGeometry(1.2, 0.7),
                new THREE.MeshBasicMaterial({ map: evsHUD.texture, transparent: true, opacity: 0.7 })
            );
            evsScreen.position.set(x, 1.05, -3.45);
            evsScreen.rotation.x = 0.55;
            dashGroup.add(evsScreen);

            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.8, 0.05), this.matteMetal);
            frame.position.set(x, 1.05, -3.5);
            frame.rotation.x = 0.55;
            dashGroup.add(frame);
        }

        // 3. GUARDED EMERGENCY SWITCHES
        for (let x = -0.6; x <= 0.6; x += 0.6) {
            const guardGeo = new THREE.BoxGeometry(0.25, 0.25, 0.1);
            const guard = new THREE.Mesh(guardGeo, this.guardMat);
            guard.position.set(x, 0.95, -2.8);
            guard.rotation.x = 0.55;
            dashGroup.add(guard);

            const sw = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), this.brushedAlum);
            sw.position.set(x, 0.92, -2.8);
            sw.rotation.x = 1.0;
            dashGroup.add(sw);
        }

        // 4. CIRCUIT BREAKER PANELS (Side Console)
        for (let s = -1; s <= 1; s += 2) {
            const cbPanel = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.5, 0.1), this.matteMetal);
            cbPanel.position.set(s * 5.2, 1.2, -4.5);
            cbPanel.rotation.y = s * -1.2;
            dashGroup.add(cbPanel);

            for (let r = 0; r < 5; r++) {
                for (let c = 0; c < 3; c++) {
                    const cb = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 16), this.brushedAlum);
                    cb.position.set(s * 5.23, 0.7 + (r * 0.2), -4.5 + (c * 0.2 - 0.2));
                    cb.rotation.z = Math.PI / 2 * s;
                    dashGroup.add(cb);
                }
            }
        }

        // 5. COMM GRILLES & SPEAKER UNIT
        const speaker = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.4, 0.1), this.brushedAlum);
        speaker.position.set(0, 1.2, -2.7);
        dashGroup.add(speaker);
        for (let i = 0; i < 5; i++) {
            const vent = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.02), this.matteMetal);
            vent.position.set(0, 1.25 - i * 0.05, -2.65);
            dashGroup.add(vent);
        }

        this.scene.add(dashGroup);
    }

    buildControlGears() {
        // Dual Pilot Control Sets
        for (let s = -1; s <= 1; s += 2) {
            const gearGroup = new THREE.Group();

            // 1. MAIN FLIGHT STICK (Joystick)
            const stickBase = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.1, 16), this.matteMetal);
            gearGroup.add(stickBase);

            const boot = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), new THREE.MeshStandardMaterial({ color: 0x111111 }));
            boot.position.y = 0.1;
            gearGroup.add(boot);

            const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 12), this.matteMetal);
            handle.position.set(0, 0.4, 0);
            handle.rotation.x = 0.2;
            gearGroup.add(handle);

            const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.4, 0.1), this.matteMetal);
            grip.position.set(0, 0.6, 0.1);
            gearGroup.add(grip);

            const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
            trigger.position.set(0, 0.7, 0.15);
            gearGroup.add(trigger);

            // 2. THROTTLE QUADRANT (Levers)
            const throttleBase = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.15, 0.6), this.matteMetal);
            throttleBase.position.set(0.6 * s, 0, 0.3);
            gearGroup.add(throttleBase);

            for (let l = 0; l < 2; l++) {
                const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 8), this.brushedAlum);
                lever.position.set(0.6 * s + (l * 0.2 - 0.1), 0.2, 0.3);
                lever.rotation.x = -0.4;
                gearGroup.add(lever);

                const knob = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.12), this.matteMetal);
                knob.position.set(0.6 * s + (l * 0.2 - 0.1), 0.4, 0.2);
                gearGroup.add(knob);
            }

            // Position gear set in front of seats
            gearGroup.position.set(s * 2.8, 0.5, -2.5);
            this.scene.add(gearGroup);
        }
    }

    buildHighFidelitySeats() {
        for (let s = -1; s <= 1; s += 2) {
            const chair = new THREE.Group();

            const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.8, 32), this.matteMetal);
            chair.add(pedestal);

            const suspension = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 24), this.brushedAlum);
            suspension.rotation.x = Math.PI / 2;
            suspension.position.y = 0.4;
            chair.add(suspension);

            const frame = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.3, 1.6), this.matteMetal);
            frame.position.y = 0.65;
            chair.add(frame);

            const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.4, 1.4), this.titaniumPro);
            cushion.position.y = 0.8;
            chair.add(cushion);

            const backFrame = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.2, 0.3), this.matteMetal);
            backFrame.position.set(0, 1.8, 0.7);
            backFrame.rotation.x = -0.15;
            chair.add(backFrame);

            const lumbar1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.6, 8, 16), this.titaniumPro);
            lumbar1.position.set(0, 1.4, 0.55);
            lumbar1.rotation.x = -0.15;
            chair.add(lumbar1);

            const lumbar2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.8, 8, 16), this.titaniumPro);
            lumbar2.position.set(0, 2.2, 0.45);
            lumbar2.rotation.x = -0.15;
            chair.add(lumbar2);

            const headrest = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.2, 8, 16), this.titaniumPro);
            headrest.position.set(0, 3.1, 0.9);
            chair.add(headrest);

            for (let a = -1; a <= 1; a += 2) {
                const arm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 1.25), this.matteMetal);
                arm.position.set(a * 1.0, 1.25, 0.1);
                chair.add(arm);
                const pad = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.8), new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 }));
                pad.rotation.x = -Math.PI / 2;
                pad.position.set(a * 1.0, 1.36, 0.1);
                chair.add(pad);
            }

            chair.position.set(s * 2.8, -0.4, 0);
            chair.scale.set(0.8, 0.8, 0.8);

            // Interaction Point for Sitting
            this.seats.push({
                position: chair.position.clone(),
                seatHeight: 0.65,
                id: s === -1 ? 'Left' : 'Right'
            });
            this.seatClickTargets.push(chair);

            this.scene.add(chair);
        }
    }

    buildCeilingModules() {
        const ceil = new THREE.Mesh(new THREE.BoxGeometry(15, 0.5, 25), this.matteMetal);
        ceil.position.set(0, 5.5, 0);
        this.scene.add(ceil);
        for (let z = -5; z <= 5; z += 5) {
            const light = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffffff }));
            light.rotation.x = Math.PI / 2; light.position.set(0, 5.2, z);
            this.scene.add(light);
        }
    }

    buildExteriorHull() {
        const hullGroup = new THREE.Group();
        this.hullGroup = hullGroup;

        const yellowMat = new THREE.MeshBasicMaterial({ color: 0xffdd00 });
        const pipeMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 1.0, roughness: 0.1 });
        const engineCore = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const thrusterFlame = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.4 });

        // 1. PRIMARY ARMORED BODY (With Procedural Panel Texture)
        const body = new THREE.Mesh(new THREE.BoxGeometry(10.2, 8.2, 22), this.extHullMat);
        body.position.set(0, 4, 1);
        hullGroup.add(body);

        // 2. COCKPIT GLASS (Outside View)
        const extWindow = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 2), new THREE.MeshPhysicalMaterial({ color: 0x050505, metalness: 1.0, roughness: 0 }));
        extWindow.position.set(0, 5, -10.1);
        extWindow.rotation.x = -0.5;
        hullGroup.add(extWindow);

        // 3. MECHANICAL GREEBLES (Pipes & Vents)
        for (let s = -1; s <= 1; s += 2) {
            // Main Side Pipes
            const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 18, 12), pipeMat);
            pipe.rotation.x = Math.PI / 2;
            pipe.position.set(s * 5.2, 2, 2);
            hullGroup.add(pipe);

            // Tactical Antennae
            const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 4, 8), pipeMat);
            ant.position.set(s * 4, 8.5, -4);
            hullGroup.add(ant);

            // Nav Flashers
            const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), new THREE.MeshBasicMaterial({ color: s === -1 ? 0xff0000 : 0x00ff00 }));
            strobe.position.set(s * 10, 2.5, 4);
            hullGroup.add(strobe);
            this.blinkLights.push(strobe);
        }

        // 4. ADVANCED ENGINE NOZZLES
        for (let s = -1; s <= 1; s += 2) {
            const engineGroup = new THREE.Group();

            // Outer Nozzle
            const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 3.2, 4, 8), this.extHullMat);
            nozzle.rotation.x = Math.PI / 2;
            engineGroup.add(nozzle);

            // Volumetric Backfire (3 layers)
            for (let i = 0; i < 3; i++) {
                const flare = new THREE.Mesh(new THREE.CylinderGeometry(1.5 - i * 0.4, 0.1, 10 + i * 5, 16), thrusterFlame);
                flare.position.z = 7 + i * 2;
                flare.rotation.x = Math.PI / 2;
                engineGroup.add(flare);
                if (i === 0) this.thrusterGlow = flare;
            }

            const core = new THREE.Mesh(new THREE.CircleGeometry(1.6, 16), engineCore);
            core.position.z = 2.1;
            engineGroup.add(core);

            engineGroup.position.set(s * 4, 2, 11);
            hullGroup.add(engineGroup);
        }

        // 5. SIDE LANDING GEAR (Static)
        for (let s = -1; s <= -1; s += 2) {
            // simplified for clarity
        }

        this.scene.add(hullGroup);
    }

    updateMovement() {
        if (this.isSitting || this.isExteriorView) return;

        // Turn (360 Degree View Control)
        if (this.keys.left) this.playerRotation += this.turnSpeed;
        if (this.keys.right) this.playerRotation -= this.turnSpeed;

        // Path-Locked Forward/Backward
        const dir = new THREE.Vector3(0, 0, -1);
        dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerRotation);

        if (this.keys.forward) this.velocity.addScaledVector(dir, this.speed);
        if (this.keys.backward) this.velocity.addScaledVector(dir, -this.speed);

        this.velocity.multiplyScalar(0.85);
        this.camera.position.add(this.velocity);

        // LOCK TO PATH (Only move on central aisle)
        this.camera.position.x = Math.max(-this.bounds.x, Math.min(this.bounds.x, this.camera.position.x));
        this.camera.position.z = Math.max(this.bounds.zMin, Math.min(this.bounds.zMax, this.camera.position.z));

        // Check for Nearby Seats (Enable Sit Prompt)
        this.nearbySeat = null;
        this.seats.forEach(seat => {
            const dist = this.camera.position.distanceTo(seat.position);
            if (dist < 3.5) {
                this.nearbySeat = seat;
            }
        });

        if (this.nearbySeat) {
            this.sitPrompt.style.display = 'block';
            this.sitPrompt.innerText = `CLICK CHAIR OR PRESS ENTER TO SIT (${this.nearbySeat.id})`;
        } else {
            this.sitPrompt.style.display = 'none';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const time = this.clock.getElapsedTime();

        this.updateMovement();

        this.smoothMouse.x += (this.mouse.x - this.smoothMouse.x) * 0.05;
        this.smoothMouse.y += (this.mouse.y - this.smoothMouse.y) * 0.05;

        if (this.isExteriorView) {
            // EXTERIOR USER-CONTROLLED VIEW (360 and Manual Rotation)
            const distance = 35;
            const rotY = this.playerRotation - (this.smoothMouse.x * 2.5);
            const rotX = (this.smoothMouse.y * 1.5);

            this.camera.position.x = Math.sin(rotY) * Math.cos(rotX) * distance;
            this.camera.position.y = Math.sin(rotX) * distance + 5;
            this.camera.position.z = Math.cos(rotY) * Math.cos(rotX) * distance;

            this.camera.lookAt(0, 0, 0);

            // Flickering Thrusters (Back Fire)
            if (this.thrusterGlow) {
                this.thrusterGlow.scale.y = 0.8 + Math.random() * 0.4;
                this.thrusterGlow.material.opacity = 0.4 + Math.random() * 0.4;
            }
        } else if (this.isSitting && this.activeSeat) {
            // Lerp to Seat Position (Raised and forward for better dash view)
            const targetPosX = this.activeSeat.position.x;
            const targetPosZ = -1.8;
            const targetPosY = this.activeSeat.position.y + 1.6;

            this.camera.position.x += (targetPosX - this.camera.position.x) * 0.1;
            this.camera.position.z += (targetPosZ - this.camera.position.z) * 0.1;
            this.camera.position.y += (targetPosY - this.camera.position.y) * 0.1;

            // Lock rotation towards dashboard
            this.playerRotation += (0 - this.playerRotation) * 0.1;
        }

        this.camera.rotation.y = this.playerRotation - (this.smoothMouse.x * 1.2);
        this.camera.rotation.x = this.smoothMouse.y * 0.45;
        this.camera.position.y += (Math.sin(time * 25) * 0.001);

        this.hudCanvases.forEach(h => h.update(time));
        this.blinkLights.forEach((l, i) => { l.visible = Math.sin(time * 6 + i) > 0; });
        if (this.earth) this.earth.rotation.y += 0.0001;

        this.renderer.render(this.scene, this.camera);
    }

    handleEvents() {
        window.addEventListener('mousemove', (e) => {
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Click to Sit
        window.addEventListener('mousedown', (e) => {
            if (this.isSitting) return;

            this.clickMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.clickMouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

            this.raycaster.setFromCamera(this.clickMouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.seatClickTargets, true);

            if (intersects.length > 0) {
                // Determine which seat was clicked based on intersection X position
                const hitX = intersects[0].point.x;
                this.activeSeat = this.seats.find(s => (hitX < 0 && s.id === 'Left') || (hitX > 0 && s.id === 'Right'));
                if (this.activeSeat) {
                    this.isSitting = true;
                    this.sitPrompt.innerText = 'PRESS ENTER TO STAND';
                }
            }
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowUp') this.keys.forward = true;
            if (e.key === 'ArrowDown') this.keys.backward = true;
            if (e.key === 'ArrowLeft') this.keys.left = true;
            if (e.key === 'ArrowRight') this.keys.right = true;

            if (e.key.toLowerCase() === 'o') {
                this.isExteriorView = !this.isExteriorView;
                if (this.isExteriorView) {
                    this.sitPrompt.style.display = 'block';
                    this.sitPrompt.innerText = 'EXTERIOR VIEW ACTIVE (PRESS O TO RETURN)';
                } else {
                    this.sitPrompt.style.display = 'none';
                }
            }

            if (e.key === 'Enter') {
                if (this.isSitting) {
                    // STAND UP
                    this.isSitting = false;
                    this.activeSeat = null;
                    this.sitPrompt.innerText = 'PRESS ENTER TO SIT';
                    // Move slightly back so we don't instantly sit again
                    this.camera.position.z += 1;
                } else if (this.nearbySeat) {
                    // SIT DOWN
                    this.isSitting = true;
                    this.activeSeat = this.nearbySeat;
                    this.sitPrompt.innerText = 'PRESS ENTER TO STAND';
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'ArrowUp') this.keys.forward = false;
            if (e.key === 'ArrowDown') this.keys.backward = false;
            if (e.key === 'ArrowLeft') this.keys.left = false;
            if (e.key === 'ArrowRight') this.keys.right = false;
        });

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
}
