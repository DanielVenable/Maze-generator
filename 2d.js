import Maze from "./maze.js";

const ctx = document.querySelector('canvas').getContext('2d');
const inputs = document.querySelectorAll('input');
const scale = 10;

document.addEventListener('keydown', e => {
    if (e.key === 'Enter') drawMaze();
})

document.querySelector('#print').addEventListener('click', () => window.print());

document.querySelector('#generate').addEventListener('click', drawMaze);

function drawMaze() {
    document.querySelector('#print').hidden = false;
    let [height, width, thickness] = [...inputs].map(a => +a.value);
    height = Math.floor(height);
    width = Math.floor(width);
    if (!(height > 0 && width > 0 && 0 < thickness && thickness < 1)) {
        alert('Please enter valid values');
        return;
    }
    ctx.canvas.height = (height + 1) * scale;
    ctx.canvas.width  = (width  + 1) * scale;
    ctx.setTransform(scale, 0, 0, scale, 10.5, 10.5);
    ctx.fillRect(-1, -1, width + 1, height + 1);
    const { lines, segments } = new Maze(width, height);
    ctx.lineWidth = thickness;
    ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(0, -1);

    for (const { start, end } of lines) {
        ctx.lineTo(...start);
        ctx.lineTo(...end);
    }
    ctx.lineTo(width - 1, height);
    ctx.stroke();
    ctx.lineCap = 'square';
    for (const { start, end } of segments) {
        ctx.beginPath();
        ctx.moveTo(...start);
        ctx.lineTo(...end);
        ctx.stroke();
    }
}