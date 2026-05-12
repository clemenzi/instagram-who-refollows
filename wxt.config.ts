import { defineConfig } from "wxt";

import tailwindcss from "@tailwindcss/vite";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "Who refollows me?",
    description: "Check who doesn't follow you back",
    permissions: ["tabs"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
