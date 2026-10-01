// biome-ignore-all lint/correctness/noNodejsModules: Regression tests run in Node, not in the extension.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const ID_PATTERN = /^[1-9]\d*$/;
const CURSOR_ERROR = /invalid pagination cursor/;
const ADVANCING_ERROR = /stopped advancing/;
const MISSING_PAGE_ERROR = /omitted the next page/;
const source = ts.transpileModule(
  fs.readFileSync(`${__dirname}/../entrypoints/instagram.content/friendships.ts`, "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function setup(pages) {
  const requests = [];
  const context = {
    exports: {},
    require: () => ({
      isInstagramId: (value) =>
        (typeof value === "string" && ID_PATTERN.test(value)) ||
        (typeof value === "number" && Number.isSafeInteger(value) && value > 0),
      PROFILE_PAGE_SIZE: 50,
      REQUEST_DELAY_MS: 0,
      delay: () => Promise.resolve(),
      fetchInstagramJson: (path, params) => {
        requests.push({ path, params });
        assert.ok(pages.length, "Unexpected extra page request");
        return Promise.resolve(pages.shift());
      },
    }),
  };
  vm.runInNewContext(source, context);
  return { run: context.exports.fetchProfiles, requests };
}

function page(id, cursor) {
  return {
    status: "ok",
    users: [{ pk: id, username: `profile${id}` }],
    next_max_id: cursor,
  };
}

for (const cursor of ["50|opaque:token==", "123456", 123456]) {
  test(`passes cursor ${cursor} unchanged to the next page`, async () => {
    const { run, requests } = setup([page("1", cursor), page("2")]);
    const profiles = await run("42", "following");
    assert.equal(profiles.length, 2);
    assert.equal(requests.length, 2);
    assert.equal(requests[1].params.max_id, String(cursor));
  });
}

for (const cursor of [{ token: "next" }, true, "   "]) {
  test(`rejects malformed cursor ${JSON.stringify(cursor)}`, async () => {
    await assert.rejects(() => setup([page("1", cursor)]).run("42", "following"), CURSOR_ERROR);
  });
}

test("rejects a repeated opaque cursor instead of looping", async () => {
  const { run, requests } = setup([page("1", "next|token"), page("2", "next|token")]);
  await assert.rejects(() => run("42", "following"), ADVANCING_ERROR);
  assert.equal(requests.length, 2);
});

test("rejects an incomplete page without a cursor", async () => {
  await assert.rejects(
    () => setup([{ ...page("1"), has_more: true }]).run("42", "followers"),
    MISSING_PAGE_ERROR,
  );
});
