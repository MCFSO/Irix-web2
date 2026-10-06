import { defineConfig } from '@rsbuild/core'
import { pluginReact } from '@rsbuild/plugin-react'

export default defineConfig({
  plugins: [pluginReact()],
  source: {
    entry: {
      index: './src/main.tsx',
    },
  },
  html: {
    title: 'IriX Node 面板',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:12346',
        changeOrigin: true,
        ws: true,
      },
      '/download': {
        target: 'http://127.0.0.1:12346',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://127.0.0.1:12346',
        changeOrigin: true,
      },
    },
  },
  output: {
    distPath: {
      root: 'dist',
    },
  },
})
