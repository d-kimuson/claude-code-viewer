import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = join(__dirname, "..");
const localesDir = join(rootDir, "src/lib/i18n/locales");

const locales = readdirSync(localesDir).filter((item) => {
  const itemPath = join(localesDir, item);
  return statSync(itemPath).isDirectory();
});

for (const locale of locales) {
  const filePath = join(
    rootDir,
    "src/lib/i18n/locales",
    locale,
    "messages.json",
  );

  try {
    const content = readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);

    // キーをアルファベット順にソート
    const sortedKeys = Object.keys(data).sort();
    const sortedData = {};

    for (const key of sortedKeys) {
      const message = data[key];
      // originの配列もソートする (ファイルパスと行番号で比較)
      if (message.origin && Array.isArray(message.origin)) {
        message.origin.sort((a, b) => {
          // 要素がタプルの場合 [file, line]
          if (Array.isArray(a) && Array.isArray(b)) {
            const fileCheck = String(a[0]).localeCompare(String(b[0]));
            if (fileCheck !== 0) return fileCheck;
            return (Number(a[1]) || 0) - (Number(b[1]) || 0);
          }
          return 0;
        });
      }
      sortedData[key] = message;
    }

    writeFileSync(
      filePath,
      `${JSON.stringify(sortedData, null, 2)}\n`,
      "utf-8",
    );

    console.log(`✓ Sorted ${locale}/messages.json`);
  } catch (error) {
    console.error(`✗ Failed to sort ${locale}/messages.json:`, error.message);
    process.exit(1);
  }
}

console.log("All translation files sorted successfully!");
