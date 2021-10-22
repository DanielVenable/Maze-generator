export default class Maze {
    lines = [];
    segments = [];

    constructor(width, height) {
        let current = new Rect(0.5, 0.5 + width, 0.5, 0.5 + height, [1, 1], [width, height]);
        const later = [];
        const grid = [];
        for (let i = 1; i <= height; i++) {
            grid[i] = [];
        }
        while (true) {
            if (current.isLine) {
                this.lines.push(current);
                if (current.start[0] === current.end[0]) {
                    const max = Math.max(current.start[1], current.end[1])
                    for (let y = Math.min(current.start[1], current.end[1]); y <= max; y++) {
                        grid[y][current.start[0]] = true;
                    }
                } else if (current.start[1] === current.end[1]) {
                    const max = Math.max(current.start[0], current.end[0]);
                    for (let x = Math.min(current.start[0], current.end[0]); x <= max; x++) {
                        grid[current.start[1]][x] = true;
                    }
                }
                if (current = later.pop()) continue;
                break;
            }
            const [r1, r2] = current.subrects();
            current = r1;
            if (r2) later.push(r2);
        }

        const isValid = ({ end: [x, y] }) =>
            0 < x && x <= width && 0 < y && y <= height && !grid[y][x];

        const potentialSegments = new Shuffler;
        grid.forEach((arr, y) => arr.forEach((_, x) => addValidAdjacentSegments(x, y)));

        function addValidAdjacentSegments(x, y) {
            const start = [x, y];
            addIfValid(new Segment(start, [x - 1, y]));
            addIfValid(new Segment(start, [x + 1, y]));
            addIfValid(new Segment(start, [x, y - 1]));
            addIfValid(new Segment(start, [x, y + 1]));
        }

        function addIfValid(segment) {
            if (isValid(segment)) potentialSegments.push(segment);
        }

        while (potentialSegments.size) {
            const segment = potentialSegments.pull();
            if (!isValid(segment)) continue;
            this.segments.push(segment);
            const [x, y] = segment.end;
            grid[y][x] = true;
            addValidAdjacentSegments(x, y);
        }
    }
}

class Rect {
    constructor(left, right, top, bottom, start, end) {
        this.left = left;
        this.right = right;
        this.top = top;
        this.bottom = bottom;
        this.start = start;
        this.end = end;
        this.args = Object.freeze(arguments);
    }

    subrects() {
        const width = this.right - this.left - 1,
            height = this.bottom - this.top - 1;
        const cutNum = random(width + height) + 1;
        const args = [...this.args];
        if (cutNum <= width) {
            const x = cutNum + this.left;
            args[this.start[0] < x ? 1 : 0] = x;
            if ((this.start[0] < x) === (this.end[0] < x)) {
                return [new Rect(...args)];
            } else {
                const args2 = [...this.args];
                args2[this.end[0] < x ? 1 : 0] = x;
                const y = random(height + 1) + this.top + 0.5;
                args[5]  = [this.start[0] < x ? x - 0.5 : x + 0.5, y];
                args2[4] = [this.end  [0] < x ? x - 0.5 : x + 0.5, y];
                return [new Rect(...args), new Rect(...args2)];
            }
        } else {
            const y = cutNum - width + this.top;
            args[this.start[1] < y ? 3 : 2] = y;
            if ((this.start[1] < y) === (this.end[1] < y)) {
                return [new Rect(...args)];
            } else {
                const args2 = [...this.args];
                args2[this.end[1] < y ? 3 : 2] = y;
                const x = random(width + 1) + this.left + 0.5;
                args[5]  = [x, this.start[1] < y ? y - 0.5 : y + 0.5];
                args2[4] = [x, this.end  [1] < y ? y - 0.5 : y + 0.5];
                return [new Rect(...args), new Rect(...args2)];
            }
        }
    }

    get isLine() {
        return this.bottom - this.top === 1 || this.right - this.left === 1;
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