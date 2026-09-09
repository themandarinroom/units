import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildUnitLibraryIndex } from "../index-builder.mjs";

const inputPath = process.argv[2];
if (!inputPath) {
  console.error("Usage: node scripts/generate-unit-library-index.mjs <authorised-units-export.json> [output.json]");
  process.exit(1);
}

const source = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const units = Array.isArray(source) ? source : source.units;
if (!Array.isArray(units)) throw new Error("The authorised export must be an array or an object with a units array.");

const outputPath = resolve(process.argv[3] || "unit-library-index.json");
await writeFile(outputPath, `${JSON.stringify(buildUnitLibraryIndex(units), null, 2)}\n`);
console.log(`Wrote ${units.length} source Unit records to ${outputPath}`);
