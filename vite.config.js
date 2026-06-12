import fs from "node:fs";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const open = { allowedHosts: true, cors: true, host: "0.0.0.0" };

function branch() {
  const head = process.env.GIT_BRANCH;
  if (head) return head;
  try {
    const text = fs.readFileSync(".git/HEAD", "utf8").trim();
    return text.startsWith("ref:") ? text.replace("ref: refs/heads/", "") : text.slice(0, 7);
  } catch {
    return null;
  }
}

export default defineConfig({
  plugins: [react()],
  define: { __BRANCH__: JSON.stringify(branch()) },
  server: open,
  preview: open,
});
