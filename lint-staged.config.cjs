module.exports = {
  "*.{js,jsx,ts,tsx}": [
    "prettier --write"
  ],
  "*.{json,md}": [
    "prettier --write"
  ],
  // Optional: type-check if TS project
  // "*.ts?(x)": ["npx tsc --noEmit"],
};