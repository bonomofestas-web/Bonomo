import fs from 'fs';
import path from 'path';
import { PNG } from 'pngjs';

function processImageSync(inputPath, outputPath, options = {}) {
  const { isCheckerboard = true, isBlackBg = false } = options;

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    return;
  }

  const buffer = fs.readFileSync(inputPath);
  const png = PNG.sync.read(buffer);
  const width = png.width;
  const height = png.height;

  const visited = new Uint8Array(width * height);
  const queue = [];

  const isBgPixel = (x, y) => {
    const idx = (width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];

    if (a === 0) return true;

    if (isBlackBg) {
      return r < 35 && g < 35 && b < 35;
    }

    if (isCheckerboard) {
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const diff = max - min;
      // Checkerboard greys & whites (low saturation)
      if (diff < 28) {
        // Light grey / white tiles (R,G,B > 180) or medium grey tiles (R,G,B between 110 and 175)
        if ((r > 175 && g > 175 && b > 175) || (r > 105 && r < 178 && g > 105 && g < 178 && b > 105 && b < 178)) {
          return true;
        }
      }
    }
    return false;
  };

  // Outer border seed points for BFS
  for (let x = 0; x < width; x++) {
    if (isBgPixel(x, 0)) { queue.push(x, 0); visited[x] = 1; }
    if (isBgPixel(x, height - 1)) { queue.push(x, height - 1); visited[(height - 1) * width + x] = 1; }
  }
  for (let y = 0; y < height; y++) {
    if (isBgPixel(0, y)) { queue.push(0, y); visited[y * width] = 1; }
    if (isBgPixel(width - 1, y)) { queue.push(width - 1, y); visited[y * width + width - 1] = 1; }
  }

  let head = 0;
  while (head < queue.length) {
    const x = queue[head++];
    const y = queue[head++];
    const idx = (width * y + x) << 2;

    png.data[idx + 3] = 0; // Set Alpha to 0 (fully transparent)

    const neighbors = [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nPos = ny * width + nx;
        if (!visited[nPos]) {
          if (isBgPixel(nx, ny)) {
            visited[nPos] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  const outBuffer = PNG.sync.write(png);
  fs.writeFileSync(outputPath, outBuffer);
  console.log(`Successfully processed: ${path.basename(outputPath)}`);
}

const brainDir = 'C:\\Users\\--\\.gemini\\antigravity-ide\\brain\\e14268c1-3d04-4989-8730-72dd6838d76a';
const publicDir = 'c:\\Users\\--\\OneDrive\\Documents\\Codex Projetos\\Bonomo Festas 2\\public';

processImageSync(path.join(brainDir, 'reward_clock_3d_1786914016847.png'), path.join(publicDir, 'reward_clock.png'));
processImageSync(path.join(brainDir, 'reward_table_3d_1786914026665.png'), path.join(publicDir, 'reward_table.png'));
processImageSync(path.join(brainDir, 'reward_apple_watch_3d_1786914043098.png'), path.join(publicDir, 'reward_watch.png'));
processImageSync(path.join(brainDir, 'reward_iphone_3d_1786914052606.png'), path.join(publicDir, 'reward_iphone.png'));
processImageSync(path.join(brainDir, 'reward_travel_3d_1786914070646.png'), path.join(publicDir, 'reward_travel.png'));
