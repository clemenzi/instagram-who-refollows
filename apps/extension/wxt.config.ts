import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  manifest: {
    name: "Who refollows me?",
    description: "Check who doesn't follow you back",
    permissions: ["tabs", "cookies"],
    host_permissions: ["https://www.instagram.com/*"],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
