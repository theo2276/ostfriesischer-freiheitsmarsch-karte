import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("redirects the site root to the interactive route map", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(page, /redirect\("\/ofm-karte"\)/);
});

test("uses the 2027 dates and omits elevation information", async () => {
  const [page, rawRoutes] = await Promise.all([
    readFile(new URL("../app/ofm-karte/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/freiheitsmarsch-routes.json", import.meta.url), "utf8"),
  ]);
  const routes = JSON.parse(rawRoutes);

  assert.match(page, /12\. JUNI/);
  assert.match(page, /13\. JUNI/);
  assert.match(page, /marketedDistance\(route\)/);
  assert.doesNotMatch(page, /Höhenmeter|HÖHENPROFIL/);

  assert.equal(routes.length, 8);
  assert.equal(routes.filter((route) => route.day === "Samstag").length, 4);
  assert.equal(routes.filter((route) => route.day === "Sonntag").length, 4);
  assert.ok(routes.every((route) => /12\.06\.27|12\.06\.2027|13\.06\.27|13\.06\.2027/.test(route.fullName)));
  assert.deepEqual(
    [...new Set(routes.map((route) => route.name.match(/(5|10|24|42) km/)?.[1]))],
    ["5", "10", "24", "42"],
  );
});
