import { mkdir, writeFile } from "node:fs/promises";

const OUT = "originals";
const base = "https://images.unsplash.com/photo-";
const images = {
  hero: "1586611292717-f828b167408c?auto=format&fit=crop&w=1800&q=85",
  pool: "1650965171703-087486b3a1b0?auto=format&fit=crop&w=1400&q=80",
  coast: "1718939050480-a19862c5b3b7?auto=format&fit=crop&w=1400&q=80",
  room: "1760067537740-faa11f7bdf1e?auto=format&fit=crop&w=1400&q=80",
  lounge: "1760067537567-f3e1f8ad7ef7?auto=format&fit=crop&w=1400&q=80",
  villa: "1759472077408-a4cdfd4ff3dd?auto=format&fit=crop&w=1400&q=80",
  beach: "1672421187649-7ee687342e9e?auto=format&fit=crop&w=1400&q=80",
  sunset: "1577563407146-5dca967c5716?auto=format&fit=crop&w=1400&q=80",
  city: "1694968433606-df475600d7b6?auto=format&fit=crop&w=1400&q=80",
};

await mkdir(OUT, { recursive: true });
for (const [name, path] of Object.entries(images)) {
  const res = await fetch(base + path + "&fm=jpg");
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
  await writeFile(`${OUT}/${name}.jpg`, Buffer.from(await res.arrayBuffer()));
  console.log("downloaded:", name);
}