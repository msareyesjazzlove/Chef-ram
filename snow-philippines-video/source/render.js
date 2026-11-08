const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const mode = process.argv[2] || 'stills';
(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('console', m => console.log('PAGE:', m.text()));
  page.on('pageerror', e => console.log('ERR:', e.message));
  await page.goto('http://127.0.0.1:8765/index.html');
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
  const toBuf = d => Buffer.from(d.split(',')[1], 'base64');
  if (mode === 'stills') {
    fs.mkdirSync('stills', { recursive: true });
    for (const t of (process.argv[3] || '5,15,26,38,50,62,74,84').split(',').map(Number)) {
      const s = Date.now();
      const d = await page.evaluate(t => window.frameJPEG(t), t);
      fs.writeFileSync(`stills/t${t}.jpg`, toBuf(d)); console.log('t', t, Date.now() - s, 'ms');
    }
  } else {
    const fps = 30, total = 90 * fps;
    const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', 'video_noaudio.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
    const s = Date.now();
    for (let f = 0; f < total; f++) {
      const d = await page.evaluate(t => window.frameJPEG(t, 0.93), f / fps);
      if (!ff.stdin.write(toBuf(d))) await new Promise(r => ff.stdin.once('drain', r));
      if (f % 150 === 0) console.log('frame', f, ((Date.now() - s) / 1000).toFixed(0) + 's');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await browser.close();
})();
