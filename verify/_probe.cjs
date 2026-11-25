const fs = require("node:fs");
const css = fs.readFileSync("src/styles/medmate.css", "utf8");

/**
 * Print the product stylesheet's rules for a class, so the intended markup
 * for a screen can be read from the CSS the deployed MVP ships.
 */
for (const name of process.argv.slice(2)) {
  const re = new RegExp("\\." + name + "(?![\\w-])[^{}]*\\{[^}]*\\}", "g");
  const rules = css.match(re);
  console.log(`\n.${name}`);
  if (!rules) {
    console.log("  MISSING");
    continue;
  }
  for (const rule of rules) console.log("  " + rule);
}
