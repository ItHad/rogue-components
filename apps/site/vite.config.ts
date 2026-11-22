import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

/** Cloudflare Web Analytics のサイトトークン (公開ページに載る値で、秘密ではない) */
const CF_BEACON_TOKEN = "02ff9bc5a88049939e942cc34827c954";

/** アクセス解析のタグは本番用のビルドにだけ入れる (手元の確認で数字が増えないように) */
function cloudflareWebAnalytics(): Plugin {
  return {
    name: "cloudflare-web-analytics",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "script",
        attrs: {
          type: "module",
          src: "https://static.cloudflareinsights.com/beacon.min.js",
          "data-cf-beacon": JSON.stringify({ token: CF_BEACON_TOKEN }),
        },
        injectTo: "body",
      },
    ],
  };
}

export default defineConfig({
  plugins: [react(), cloudflareWebAnalytics()],
});
