module.exports = {
  '*.{js,jsx,ts,tsx,mjs,cjs,mts,cts}': ['eslint --fix', 'prettier --write'],
  '*.{json,md,yml,yaml,toml}': ['prettier --write'],
  // Optional: type-check if TS project
  // "*.ts?(x)": ["npx tsc --noEmit"],
};
