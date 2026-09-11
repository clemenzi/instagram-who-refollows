// biome-ignore-all lint/correctness/noNodejsModules: Regression tests run in Node, not in the extension.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const ID_PATTERN = /^[1-9]\d*$/;
const CONFIRMATION_ERROR = /did not confirm/;
const SESSION_ERROR = /session data/;

const source = ts.transpileModule(
  fs.readFileSync(`${__dirname}/../entrypoints/instagram.content/unfollow.ts`, "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;

function setup(result) {
  const requests = [];
  const context = {
    exports: {},
    require: () => ({
      INSTAGRAM_APP_ID: "test",
      isInstagramId: (value) => ID_PATTERN.test(value),
    }),
    document: {
      cookie: "csrftoken=test",
      querySelectorAll: () => [
        {
          textContent: JSON.stringify({
            define: [
              ["DTSGInitialData", [], { token: "test-dtsg" }, 1],
              ["LSD", [], { token: "test-lsd" }, 2],
            ],
          }),
        },
      ],
    },
    URLSearchParams,
    fetch: (url, options) => {
      requests.push({ url, options });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(result) });
    },
  };
  vm.runInNewContext(source, context);
  return { run: context.exports.unfollowProfile, requests, context };
}

const confirmed = {
  data: {
    xdt_destroy_friendship: {
      username: "thasup",
      id: "327802853",
      friendship_status: { following: false },
    },
  },
};

test("sends the observed GraphQL mutation and accepts its response", async () => {
  const { run, requests } = setup(confirmed);
  await run("327802853");
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, "/api/graphql");
  const body = new URLSearchParams(requests[0].options.body);
  assert.equal(body.get("doc_id"), "27789106940691111");
  assert.equal(body.get("fb_api_req_friendly_name"), "usePolarisUnfollowMutation");
  assert.equal(body.get("fb_dtsg"), "test-dtsg");
  assert.equal(JSON.parse(body.get("variables")).target_user_id, "327802853");
});

for (const [name, response] of Object.entries({
  "GraphQL error": { ...confirmed, errors: [{ message: "denied" }] },
  "wrong account": {
    data: { xdt_destroy_friendship: { id: "42", friendship_status: { following: false } } },
  },
  "still following": {
    data: { xdt_destroy_friendship: { id: "327802853", friendship_status: { following: true } } },
  },
  "missing confirmation": { data: null },
})) {
  test(`rejects ${name} even with HTTP 200`, async () => {
    await assert.rejects(() => setup(response).run("327802853"), CONFIRMATION_ERROR);
  });
}

test("missing session data prevents sending a mutation", async () => {
  const { run, context, requests } = setup(confirmed);
  context.document.querySelectorAll = () => [];
  await assert.rejects(() => run("327802853"), SESSION_ERROR);
  assert.equal(requests.length, 0);
});
