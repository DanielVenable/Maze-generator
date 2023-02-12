import Maze from '../maze.js';
import * as THREE from 'https://cdn.skypack.dev/three@0.133.1';
import { PointerLockControls } from 'https://cdn.skypack.dev/three@0.133.1/examples/jsm/controls/PointerLockControls';

const game = {
    SPEED: 3,
    isSpaceDown: false,
    renderer: new THREE.WebGLRenderer(),
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100),
    material: new THREE.MeshLambertMaterial({ map: new THREE.TextureLoader().load('./wall.png') }),
    winLight: new THREE.PointLight(0x0000ff, 15, 3, 2),
    controls: null,
    clock: null,
    direction: new THREE.Vector3(),
    gridDirection: {
        dim: null,
        sign: 0
    },
    gridPosition: null,
    motion: {
        offset: 0,
        dim: null,
        isStopped: false
    },
    walls: null,
    started: false,
    won: false,
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
};

const elems = {
    controls:  document.querySelector('#controls'),
    pos:       document.querySelector('#pos'),
    time:      document.querySelector('#time'),
    win:       document.querySelector('#win'),
    size:      document.querySelector('#size'),
    totalTime: document.querySelector('#total-time')
};

{
    document.querySelector('#controls button').addEventListener('click', start);
    document.querySelector('#win button').addEventListener('click', () => elems.win.hidden = true);

    game.renderer.setSize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', () => {
        game.renderer.setSize(window.innerWidth, window.innerHeight);
        game.camera.aspect = window.innerWidth / window.innerHeight;
        game.camera.updateProjectionMatrix();
    });

    document.body.appendChild(game.renderer.domElement);

    game.renderer.render(game.scene, game.camera);

    document.addEventListener('keydown', e => { if (e.code === 'Space') game.isSpaceDown = true; });
    document.addEventListener('keyup',   e => { if (e.code === 'Space') game.isSpaceDown = false; });

    const light = new THREE.PointLight(0xffffff, 0.7, 10, 2);
    light.position.set(1, 1, 1);
    game.scene.add(game.camera);
    game.camera.add(light);
    game.scene.add(new THREE.AmbientLight(0xffffff, 0.2));
    game.scene.add(game.winLight);

    game.controls = new PointerLockControls(game.camera, game.renderer.domElement);

    game.controls.addEventListener('lock', () => elems.controls.hidden = true);
    game.controls.addEventListener('unlock', () => elems.controls.hidden = false);

    game.renderer.domElement.addEventListener('click',
        () => game.controls.isLocked ? game.controls.unlock() : game.controls.lock());
}

function loop() {
    requestAnimationFrame(() => {
        updatePosition();
        game.renderer.render(game.scene, game.camera);
        loop();
    });
}

function updatePosition() {
    const delta = game.clock.getDelta(),
        mins = Math.floor(game.clock.elapsedTime / 60),
        secs = Math.floor(game.clock.elapsedTime % 60);
    elems.time.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    if (!game.isSpaceDown) return;
    game.updateDirection();

    if (game.motion.offset === 0) {
        if (isWall()) return;
        game.motion.dim = game.gridDirection.dim;
    }

    if (game.gridDirection.dim === game.motion.dim) {
        move(game.gridDirection.sign * delta * game.SPEED);
    } else {
        move(-Math.sign(game.motion.offset) * delta * game.SPEED);
    }

    function move(distance) {
        const before = Math.sign(game.motion.offset);
        game.motion.offset += distance;

        if (before * Math.sign(game.motion.offset) === -1) stopIfShould();

        while (game.motion.offset < -2) {
            game.motion.offset += 4;
            game.gridPosition[game.motion.dim]--;
            if (game.motion.offset < 0) stopIfShould();
        }
        while (game.motion.offset > 2) {
            game.motion.offset -= 4;
            game.gridPosition[game.motion.dim]++;
            if (game.motion.offset > 0) stopIfShould();
        }

        function stopIfShould() {
            if (game.motion.dim !== game.gridDirection.dim ||
                    isWall({ sign: Math.sign(distance), dim: game.motion.dim })) {
                game.motion.offset = 0;
            }
        }
    }

    function isWall({ sign, dim } = game.gridDirection) {
        const pos = [...game.gridPosition];
        if (sign < 0) pos[dim]--;
        return [-1, game.mazeWalls.size[dim] - 1].includes(pos[dim]) ||
            game.mazeWalls.walls[dim].getElement(pos);
    }

    const pos = game.gridPosition.map(
        (value, index) => value * 4 + (index === game.motion.dim ? game.motion.offset : 0));

    elems.pos.textContent = game.gridPosition;
    game.camera.position.fromArray(pos);

    if (!game.won && game.gridPosition.every((value, index) => game.mazeWalls.size[index] === value + 1)) {
        elems.win.hidden = false;
        elems.size.textContent = game.mazeWalls.size.join('x');
        elems.totalTime.textContent =
            `${mins} minute${mins === 1 ? '' : 's'} and ${secs} second${secs === 1 ? '' : 's'}`;
        game.won = true;
        game.controls.unlock();
    }
}

function start() {
    const size = [...document.querySelectorAll('input')].map(({ value }) => Math.floor(value));
    if (!size.every(a => a > 0)) {
        alert('Please enter valid values');
        return;
    }

    game.controls.lock();

    if (game.started) {
        game.scene.remove(game.mesh);
        game.geometry.dispose();
        game.won = false;
    } else {
        game.started = true;
        document.querySelector('#data').hidden = false;
        loop();
    }

    game.clock = new THREE.Clock();
    elems.time.textContent = '0:0';
    elems.pos.textContent = '0,0,0';
    game.gridPosition = [0, 0, 0];
    game.camera.position.set(0, 0, 0);
    game.camera.lookAt(1, 0, 1);

    game.mazeWalls = new MazeWalls(new Maze(...size));
    game.geometry = game.mazeWalls.toGeometry();
    game.mesh = new THREE.Mesh(game.geometry, game.material);
    game.scene.add(game.mesh);
    game.winLight.position.set(...game.mazeWalls.size.map(a => 4 * a - 4));
}

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