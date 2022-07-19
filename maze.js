export default class Maze {
    lines = [];
    segments = [];

    constructor(...lengths) {
        this.lengths = lengths;
        this.dimensions = this.lengths.length;
        let current = new Area(Array(this.dimensions).fill(0), lengths.map(a => a - 1), lengths.map(a => [-.5, a - .5]));
        const later = [];
        const grid = new nDimArray(lengths);

        while (true) {
            if (current.isLine) {
                this.lines.push(current);
                let d = 0;
                for (; d < this.dimensions; d++) {
                    if (current.start[d] !== current.end[d]) {
                        const max = Math.max(current.start[d], current.end[d]);
                        for (let x = Math.min(current.start[d], current.end[d]); x <= max; x++) {
                            const indices = [...current.start];
                            indices[d] = x;
                            grid.setElement(indices, true);
                        }
                        break;
                    }
                }
                if (d === this.dimensions) grid.setElement(current.start, true); // loop failed to break
                if (current = later.pop()) continue;
                break;
            }
            const [r1, r2] = current.subrects();
            current = r1;
            if (r2) later.push(r2);
        }

        const isValid = ({ end }) => end.every((x, index) => 0 <= x && x < lengths[index]) && !grid.getElement(end);

        const potentialSegments = new Shuffler;
        grid.doOnIndicieses(addValidAdjacentSegments);

        function addValidAdjacentSegments(start) {
            for (let d = 0; d < start.length; d++) {
                const arr1 = [...start];
                arr1[d]++;
                addIfValid(new Segment(start, arr1));
                const arr2 = [...start];
                arr2[d]--;
                addIfValid(new Segment(start, arr2));
            }
        }

        function addIfValid(segment) {
            if (isValid(segment)) potentialSegments.push(segment);
        }

        while (potentialSegments.size) {
            const segment = potentialSegments.pull();
            if (!isValid(segment)) continue;
            this.segments.push(segment);
            grid.setElement(segment.end, true);
            addValidAdjacentSegments(segment.end);
        }
    }

    walls() {
        const unwall = (start, end) => {
            for (let d = 0; d < this.dimensions; d++) {
                if (start[d] !== end[d]) {
                    const indices = [...start];
                    indices[d] = Math.min(start[d], end[d]);
                    walls[d].setElement(indices, false);
                    return;
                }
            }
        }

        const walls = [];

        for (let d = 0; d < this.dimensions; d++) {
            walls[d] = new nDimArray(this.lengths.map((a, d2) => d2 === d ? a - 1 : a), true);
        }

        let last;
        for (const { start, end } of this.lines) {
            if (last) unwall(last, start);
            for (let d = 0; d < this.dimensions; d++) {
                if (start[d] !== end[d]) {
                    const indices = [...start];
                    for (let x = Math.min(start[d], end[d]); x < Math.max(start[d], end[d]); x++) {
                        indices[d] = x;
                        walls[d].setElement(indices, false);
                    }
                    break;
                }
            }
            last = end;
        }

        for (const { start, end } of this.segments) {
            unwall(start, end);
        }

        return walls;
    }
/*
    walls() {
        const walls = [];

        for (let d = 0; d < this.dimensions; d++) {
            walls[d] = [];
            for (let x = 0; x < this.lengths[d] - 1; x++) {
                walls[d][x] = [];
            }
        }

        let last;
        for (const { start, end } of this.lines) {
            if (last) {
                unwall(last, start);
            }
            last = end;
            for (let d = 0; d < this.dimensions; d++) {
                if (start[d] !== end[d]) {
                    for (let x = Math.min(start[d], end[d]); x < Math.max(start[d], end[d]); x++) {
                        walls[d][x][] = false;
                    }
                }
            }/*
            if (x1 === x2) {
                for (let y = Math.min(y1, y2); y < Math.max(y1, y2); y++) {
                    horizontal[y][x1] = false;
                }
            } else if (y1 === y2) {
                
            }
        }

        for (const { start, end } of this.segments) {
            unwall(start, end);
        }

        function unwall([x1, y1], [x2, y2]) {
            if (x1 === x2) {
                horizontal[Math.min(y1, y2)][x1] = false;
            } else if (y1 === y2) {
                vertical[Math.min(x1, x2)][y1] = false;
            }
        }

        return { horizontal, vertical };
    }*/
}

class Area {
    constructor(start, end, position) {
        this.size = position.map(([left, right]) => right - left - 1);
        this.position = position;
        this.start = start;
        this.end = end;
    }

    subrects() {
        let cutNum = random(this.size.reduce((acc, cur) => acc + cur, 1));
        for (let d = 0; d < this.dimensions; d++) {
            if (cutNum <= this.size[d]) {
                const x = cutNum + this.position[d][0];
                const pos = this.position.map(a => [...a]);
                pos[d][this.start[d] < x ? 1 : 0] = x;
                if ((this.start[d] < x) === (this.end[d] < x)) {
                    return [new Area(this.start, this.end, pos)];
                } else {
                    const pos2 = this.position.map(a => [...a]);
                    pos2[d][this.end[d] < x ? 1 : 0] = x;
                    const point = [];
                    for (let d2 = 0; d2 < this.dimensions; d2++) {
                        if (d === d2) point[d2] = this.start[d] < x ? x - 0.5 : x + 0.5;
                        else point[d2] = random(this.size[d2] + 1) + this.position[d2][0] + .5;
                    }
                    const point2 = [...point];
                    point2[d] = this.end[d] < x ? x - 0.5 : x + 0.5
                    return [new Area(this.start, point, pos), new Area(point2, this.end, pos2)];
                }
            } else cutNum -= this.size[d];
        }
    }

    get isLine() {
        let hasNon0 = false;
        for (const item of this.size) {
            if (item !== 0) {
                if (hasNon0) return false;
                hasNon0 = true;
            }
        }
        return true;
    }

    get dimensions() {
        return this.position.length;
    }
}

class Segment {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
}

class Shuffler {
    values = [];

    push(elem) {
        this.values.push(elem);
    }

    pull() {
        const index = random(this.size);
        if (index + 1 === this.size) return this.values.pop();
        const returnee = this.values[index];
        this.values[index] = this.values.pop();
        return returnee;
    }

    get size() {
        return this.values.length;
    }
}

function random(max) {
    return Math.floor(Math.random() * max);
}

class nDimArray extends Array {
    constructor(size, fill) {
        super();
        if (size.length > 1) {
            const rest = size.slice(1);
            for (let i = 0; i < size[0]; i++) this[i] = new nDimArray(rest, fill);
        } else if (fill !== undefined) {
            this.length = size[0];
            this.fill(fill);
        }
    }

    getElement(indices) {
        if (indices.length === 1) return this[indices[0]];
        return this[indices[0]].getElement(indices.slice(1));
    }

    setElement(indices, value) {
        if (indices.length === 1) this[indices[0]] = value;
        else this[indices[0]].setElement(indices.slice(1), value);
    }  

    doOnIndicieses(callback, list = []) {
        if (this[0] instanceof nDimArray) {
            this.forEach((a, i) => a.doOnIndicieses(callback, list.concat(i)));
        } else this.forEach((value, index) => callback(list.concat(index), value));
    }
}