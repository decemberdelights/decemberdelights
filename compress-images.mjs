import sharp from "sharp";
import { stat, unlink, rename } from "fs/promises";

const tasks = [
  { file: "public/logo.png", width: 600, quality: 85, out: "public/logo.png" },
  { file: "public/logo-icon.png", width: 120, quality: 85, out: "public/logo-icon.png" },
  { file: "public/images/owners/owner.jpeg", width: 600, quality: 70, out: "public/images/owners/owner.jpeg" },
  { file: "public/items/fudge-brownie.jpg", width: 600, quality: 70, out: "public/items/fudge-brownie.jpg" },
  { file: "public/items/tiramisu.jpg", width: 600, quality: 70, out: "public/items/tiramisu.jpg" },
  { file: "public/items/espresso.jpg", width: 600, quality: 70, out: "public/items/espresso.jpg" },
  { file: "public/items/marry-me-chicken.jpg", width: 600, quality: 70, out: "public/items/marry-me-chicken.jpg" },
  { file: "public/items/bubble-tea.jpg", width: 600, quality: 70, out: "public/items/bubble-tea.jpg" },
  { file: "public/items/basque-cheesecake.jpg", width: 600, quality: 70, out: "public/items/basque-cheesecake.jpg" },
];

for (const t of tasks) {
  try {
    const before = (await stat(t.file)).size;
    const tmp = t.file + ".tmp";
    const isPng = t.file.endsWith(".png");

    let pipeline = sharp(t.file).resize({ width: t.width, fit: "inside", withoutEnlargement: true });

    if (isPng) {
      pipeline = pipeline.png({ quality: t.quality, compressionLevel: 9 });
    } else {
      pipeline = pipeline.jpeg({ quality: t.quality, mozjpeg: true });
    }

    await pipeline.toFile(tmp);
    await unlink(t.file);
    await rename(tmp, t.out);

    const after = (await stat(t.out)).size;
    console.log(`${t.file}: ${(before / 1024).toFixed(0)}KB -> ${(after / 1024).toFixed(0)}KB (${((1 - after / before) * 100).toFixed(0)}% smaller)`);
  } catch (e) {
    console.error(`Failed ${t.file}: ${e.message}`);
  }
}

console.log("Done!");
