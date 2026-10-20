// Writes THIRD_PARTY_NOTICES.md for the VSIX: the license of every npm package that ends up in
// dist/ (read from esbuild's metafile of the real bundle options, so a new dependency cannot go
// unlisted) and the Lucide icons the renderer and the modeler shell inline as geometry.
// `node scripts/third-party-notices.mjs --check` fails when the committed file is stale; a unit
// test runs that check.
import * as esbuild from "esbuild";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { host, web } from "../esbuild.config.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, "..");
const root = resolve(app, "../..");
const output = join(app, "THIRD_PARTY_NOTICES.md");

// Inlined as geometry (no npm dependency), so not visible in the metafile.
const LUCIDE = `## Lucide (lucide-static 1.59.0)

The canvas icons of \`@miragon/team-topologies-renderer\` (context pad, lasso) and the chrome icons of
\`@miragon/modeler-shell\` are Lucide icons, copied into the sources.

ISC License

Copyright (c) 2026 Lucide Icons and Contributors

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

Of the icons Lucide's LICENSE lists as derived from the Feather project, these are inlined:
\`check\`, \`circle-x\` (Feather's \`x-circle\`), \`download\`, \`link\`, \`maximize\`, \`minus\`,
\`plus\`, \`trash\`, \`triangle-alert\` (Feather's \`alert-triangle\`) and \`x\`:

The MIT License (MIT)

Copyright (c) 2013-present Cole Bemis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;

/** The npm packages with at least one byte in the production bundles, by package directory. */
async function bundledPackages() {
  const directories = new Map();
  for (const options of [host, web]) {
    const result = await esbuild.build({
      ...options,
      minify: true,
      sourcemap: false,
      write: false,
      metafile: true,
      logLevel: "silent",
      absWorkingDir: root,
      define: { ...options.define, "process.env.NODE_ENV": JSON.stringify("production") },
    });
    for (const out of Object.values(result.metafile.outputs)) {
      for (const [input, info] of Object.entries(out.inputs)) {
        if (info.bytesInOutput === 0 && !/\.(woff2?|ttf)$/.test(input)) continue;
        const match = /^(.*node_modules\/((?:@[^/]+\/)?[^/]+))\//.exec(input);
        if (match) directories.set(match[2], resolve(root, match[1]));
      }
    }
  }
  return [...directories.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function licenseText(directory) {
  const file = readdirSync(directory).find((name) => /^licen[cs]e(\.md|\.txt)?$/i.test(name));
  if (!file) throw new Error(`No license file in ${directory}`);
  // Some packages ship their license with CRLF; Git stores the notices with LF.
  return readFileSync(join(directory, file), "utf8").replace(/\r\n?/g, "\n").trim();
}

export async function noticesText() {
  const require = createRequire(import.meta.url);
  const sections = [];
  for (const [name, directory] of await bundledPackages()) {
    const manifest = require(join(directory, "package.json"));
    sections.push(
      `## ${name} ${manifest.version} (${manifest.license})\n\n\`\`\`text\n${licenseText(directory)}\n\`\`\`\n`,
    );
  }
  return [
    "# Third-party notices",
    "",
    "The Team Topologies Modeler extension bundles the following third-party software. Generated",
    "by `npm run notices -w apps/vscode`; do not edit by hand.",
    "",
    LUCIDE,
    ...sections,
  ].join("\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await noticesText();
  if (process.argv.includes("--check")) {
    if (readFileSync(output, "utf8") !== text) {
      console.error("THIRD_PARTY_NOTICES.md is stale: run `npm run notices -w apps/vscode`.");
      process.exit(1);
    }
  } else {
    writeFileSync(output, text);
  }
}
