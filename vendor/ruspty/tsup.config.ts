import { defineConfig } from 'tsup';
import { platformArchTriples } from '@napi-rs/triples';

const triples: string[] = [];
for (const platform in platformArchTriples) {
  for (const arch in platformArchTriples[platform]) {
    for (const triple of platformArchTriples[platform][arch]) {
      triples.push(triple.platformArchABI);
    }
  }
}

// they somehow forgot these
triples.push('darwin-universal');
triples.push('linux-riscv64-musl');

export default defineConfig({
  entry: ['wrapper.ts'],
  format: ['cjs'],
  splitting: false,
  dts: true,
  sourcemap: true,
  clean: true,
  external: triples.map((triple) => `./ruspty.${triple}.node`),
});
