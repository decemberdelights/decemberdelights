import { createRequire } from "module";
import { execFile } from "child_process";
import { stat } from "fs/promises";
import { promisify } from "util";

const require = createRequire(import.meta.url);
const ffmpegPath = require("ffmpeg-static");
const exec = promisify(execFile);

const videos = [
  "public/DDhero.mp4",
  "public/DDespresso.mp4",
  "public/espresso.mp4",
  "public/video.mp4",
];

for (const v of videos) {
  const before = (await stat(v)).size;
  const out = v.replace(".mp4", ".optimized.mp4");

  try {
    await exec(ffmpegPath, [
      "-i", v,
      "-c:v", "libx264",
      "-crf", "28",
      "-preset", "fast",
      "-an",
      "-movflags", "+faststart",
      "-vf", "scale='min(1280,iw)':'-2'",
      "-y", out
    ]);

    const after = (await stat(out)).size;
    console.log(`${v}: ${(before / 1024 / 1024).toFixed(1)}MB -> ${(after / 1024 / 1024).toFixed(1)}MB (${((1 - after / before) * 100).toFixed(0)}% smaller)`);
  } catch (e) {
    console.error(`Failed ${v}: ${e.stderr?.slice(0, 200) || e.message}`);
  }
}

console.log("Done! Now replace original files with optimized versions.");
