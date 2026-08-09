module.exports = {
  "*.{js,jsx,ts,tsx}": ["node_modules/.bin/eslint --fix"],
  "*.{json,md}": ["node_modules/.bin/prettier --write"],
};