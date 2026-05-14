import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function pagesBasePath() {
  const explicitBasePath = process.env.VITE_BASE_PATH;

  if (explicitBasePath) {
    return explicitBasePath.endsWith("/") ? explicitBasePath : `${explicitBasePath}/`;
  }

  if (process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY) {
    const repoName = process.env.GITHUB_REPOSITORY.split("/")[1];
    return repoName.endsWith(".github.io") ? "/" : `/${repoName}/`;
  }

  return "/";
}

export default defineConfig({
  base: pagesBasePath(),
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
  },
});
