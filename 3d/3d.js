import Maze from '../maze.js';
import * as THREE from 'https://cdn.skypack.dev/three@0.133.1';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/PointerLockControls';

class Game {
    isSpaceDown = false;
    renderer = new THREE.WebGLRenderer();
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    material = new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('./wall.png') });
    winLight = new THREE.PointLight(0x0000ff, 15, 3, 2);
    controls = null;
    clock = null;
    direction = new THREE.Vector3();
    gridDirection = {
        dim: null,
        sign: 0
    };
    gridPosition = null;
    motion = {
        offset: 0,
        dim: null,
        isStopped: false
    };
    walls = null;
    started = false;
    won = false;

    constructor() {
        document.querySelector('#controls button').addEventListener('click', () => this.start());
        document.querySelector('#win button').addEventListener('click', () => elems.win.hidden = true);
    
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
        });
    
        document.body.appendChild(this.renderer.domElement);
    
        this.renderer.render(this.scene, this.camera);
    
        document.addEventListener('keydown', e => { if (e.code === 'Space') this.isSpaceDown = true; });
        document.addEventListener('keyup',   e => { if (e.code === 'Space') this.isSpaceDown = false; });
    
        const light = new THREE.PointLight(0xffffff, 0.7, 10, 2);
        light.position.set(1, 1, 1);
        this.scene.add(this.camera);
        this.camera.add(light);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
        this.scene.add(this.winLight);
    
        this.controls = new PointerLockControls(this.camera, this.renderer.domElement);
    
        this.controls.addEventListener('lock', () => elems.controls.hidden = true);
        this.controls.addEventListener('unlock', () => elems.controls.hidden = false);
    
        this.renderer.domElement.addEventListener('click',
            () => this.controls.isLocked ? this.controls.unlock() : this.controls.lock());
    }

    start() {
        const size = [...document.querySelectorAll('input')].map(({ value }) => Math.floor(value));
        if (!size.every(a => a > 0)) {
            alert('Please enter valid values');
            return;
        }
    
        this.controls.lock();
    
        if (this.started) {
            this.scene.remove(this.mesh);
            this.geometry.dispose();
            this.won = false;
        } else {
            this.started = true;
            document.querySelector('#data').hidden = false;
            this.loop();
        }
    
        this.clock = new THREE.Clock();
        elems.time.textContent = '0:0';
        elems.pos.textContent = '0,0,0';
        this.gridPosition = [0, 0, 0];
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(1, 0, 1);
    
        this.mazeWalls = new MazeWalls(new Maze(...size));
        this.geometry = this.mazeWalls.toGeometry();
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);
        this.winLight.position.set(...this.mazeWalls.size.map(a => 4 * a - 4));
    }

    updateDirection() {
        this.controls.getDirection(this.direction);
        const arr = [...this.direction];
        let highestDir, highestSize = 0;
        for (let i = 0; i < 3; i++) {
            if (Math.abs(arr[i]) > Math.abs(highestSize)) {
                highestSize = arr[i];
                highestDir = i;
            }
        }
        this.gridDirection.dim = highestDir;
        this.gridDirection.sign = Math.sign(highestSize);
    }

    loop() {
        requestAnimationFrame(() => {
            this.updatePosition();
            this.renderer.render(this.scene, this.camera);
            this.loop();
        });
    }

    updatePosition() {
        const delta = this.clock.getDelta(),
            mins = Math.floor(this.clock.elapsedTime / 60),
            secs = Math.floor(this.clock.elapsedTime % 60);
        elems.time.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        if (!this.isSpaceDown) return;
        this.updateDirection();

        if (this.motion.offset === 0) {
            if (this.isWall()) return;
            this.motion.dim = this.gridDirection.dim;
        }

        if (this.gridDirection.dim === this.motion.dim) {
            this.move(this.gridDirection.sign * delta * Game.SPEED);
        } else {
            this.move(-Math.sign(this.motion.offset) * delta * Game.SPEED);
        }

        const pos = this.gridPosition.map(
            (value, index) => value * 4 + (index === this.motion.dim ? this.motion.offset : 0));

        elems.pos.textContent = this.gridPosition;
        this.camera.position.fromArray(pos);

        if (!this.won && this.gridPosition.every(
                (value, index) => this.mazeWalls.size[index] === value + 1)) {
            elems.win.hidden = false;
            elems.size.textContent = this.mazeWalls.size.join('x');
            elems.totalTime.textContent =
                `${mins} minute${mins === 1 ? '' : 's'} and ${secs} second${secs === 1 ? '' : 's'}`;
            this.won = true;
            this.controls.unlock();
        }
    }
    
    move(distance) {
        const before = Math.sign(this.motion.offset);
        this.motion.offset += distance;

        if (before * Math.sign(this.motion.offset) === -1) {
            this.stopIfShould();
        }

        while (this.motion.offset < -2) {
            this.motion.offset += 4;
            this.gridPosition[this.motion.dim]--;
            if (this.motion.offset < 0) {
                this.stopIfShould();
            }
        }
        while (this.motion.offset > 2) {
            this.motion.offset -= 4;
            this.gridPosition[this.motion.dim]++;
            if (this.motion.offset > 0) {
                this.stopIfShould();
            }
        }
    }

    stopIfShould() {
        if (this.motion.dim !== this.gridDirection.dim ||
                this.isWall({ sign: Math.sign(distance), dim: this.motion.dim })) {
            this.motion.offset = 0;
        }
    }

    isWall({ sign, dim } = this.gridDirection) {
        const pos = [...this.gridPosition];
        if (sign < 0) pos[dim]--;
        return [-1, this.mazeWalls.size[dim] - 1].includes(pos[dim]) ||
            this.mazeWalls.walls[dim].getElement(pos);
    }

    static SPEED = 3;
}

const elems = {
    controls:  document.querySelector('#controls'),
    pos:       document.querySelector('#pos'),
    time:      document.querySelector('#time'),
    win:       document.querySelector('#win'),
    size:      document.querySelector('#size'),
    totalTime: document.querySelector('#total-time')
};

class MazeWalls {
    positions = [];
    normals = [];
    uvs = [];

    constructor(maze) {
        this.walls = maze.walls();
        this.size = maze.lengths;

        for (let dimension = 0; dimension < 3; dimension++) {
            const otherDims = [0, 1, 2].filter(a => a !== dimension);

            this.walls[dimension].doOnIndicieses((indicies, isWall) => {
                const pos = indicies.map(a => 4 * a);
                pos[dimension] += 2; // so the wall is in the gap between spaces
                if (isWall) this.createFaces(pos, dimension, true);
                else for (const d of otherDims) this.createFaces(pos, d, false);
            });

            for (const x of [-2, this.size[dimension] * 4 - 2]) {
                for (let y = 0; y <= this.size[otherDims[0]] * 4 - 4; y += 2) {
                    for (let z = 0; z <= this.size[otherDims[1]] * 4 - 4; z += 2) {
                        const arr = [];
                        arr[dimension] = x;
                        arr[otherDims[0]] = y;
                        arr[otherDims[1]] = z;
                        this.createFace(arr, dimension, x === -2, true);
                    }
                }
            }
        }
    }

    createFace([x, y, z], direction, isFront, isFacingOut) {
        const mod = isFacingOut ? 1 : -1;
        if (isFront) {
            switch (direction) {
                case 0:
                    this.positions.push(
                        x + mod, y - 1, z + 1,
                        x + mod, y - 1, z - 1,
                        x + mod, y + 1, z + 1,
                        x + mod, y + 1, z + 1,
                        x + mod, y - 1, z - 1,
                        x + mod, y + 1, z - 1
                    );
                break; case 1:
                    this.positions.push(
                        x + 1, y + mod, z - 1,
                        x - 1, y + mod, z - 1,
                        x + 1, y + mod, z + 1,
                        x + 1, y + mod, z + 1,
                        x - 1, y + mod, z - 1,
                        x - 1, y + mod, z + 1
                    );
                break; case 2:
                    this.positions.push(
                        x - 1, y - 1, z + mod,
                        x + 1, y - 1, z + mod,
                        x - 1, y + 1, z + mod,
                        x - 1, y + 1, z + mod,
                        x + 1, y - 1, z + mod,
                        x + 1, y + 1, z + mod
                    );
            }
        } else {
            switch (direction) {
                case 0:
                    this.positions.push(
                        x - mod, y - 1, z - 1,
                        x - mod, y - 1, z + 1,
                        x - mod, y + 1, z - 1,
                        x - mod, y + 1, z - 1,
                        x - mod, y - 1, z + 1,
                        x - mod, y + 1, z + 1
                    );
                break; case 1:
                    this.positions.push(
                        x + 1, y - mod, z + 1,
                        x - 1, y - mod, z + 1,
                        x + 1, y - mod, z - 1,
                        x + 1, y - mod, z - 1,
                        x - 1, y - mod, z + 1,
                        x - 1, y - mod, z - 1
                    );
                break; case 2:
                    this.positions.push(
                        x + 1, y - 1, z - mod,
                        x - 1, y - 1, z - mod,
                        x + 1, y + 1, z - mod,
                        x + 1, y + 1, z - mod,
                        x - 1, y - 1, z - mod,
                        x - 1, y + 1, z - mod
                    );
            }
        }
        const normalArray = [0, 0, 0];
        normalArray[direction] = isFront ? 1 : -1;
        for (let i = 0; i < 6; i++) this.normals.push(...normalArray);
        this.uvs.push(...MazeWalls.#uvArray);
    }

    createFaces(pos, direction, isFacingOut) {
        this.createFace(pos, direction, true, isFacingOut);
        this.createFace(pos, direction, false, isFacingOut);
    }

    toGeometry() {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.positions), 3));
        geometry.setAttribute('normal',   new THREE.BufferAttribute(new Float32Array(this.normals), 3));
        geometry.setAttribute('uv',       new THREE.BufferAttribute(new Float32Array(this.uvs), 2));
        return geometry;
    }

    static #uvArray = [0, 0,  1, 0,  0, 1,  0, 1,  1, 0,  1, 1];
}

new Game();