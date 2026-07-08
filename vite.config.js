import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Enable code splitting for better performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor code into separate chunks
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'form-vendor': ['react-hook-form'],
          'state-vendor': ['zustand'],
          // Map libraries are heavy, load separately
          'map-vendor': ['leaflet', 'react-leaflet', 'react-leaflet-cluster', 'leaflet.heat'],
        },
      },
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 600,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
      },
    },
    // Enable source maps for debugging (optional, can disable for smaller builds)
    sourcemap: false,
  },
  // Optimize dev server
  server: {
    hmr: {
      overlay: true,
    },
  },
  // Optimize dependencies pre-bundling
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'zustand'],
  },
})
