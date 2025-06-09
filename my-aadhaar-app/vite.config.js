import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: true, // 👈 allow external access (e.g., from phone)
    port: 5174,
    allowedHosts: [
      'dea9-2401-4900-57f8-6449-29d1-3329-240f-a2d6.ngrok-free.app' // ✅ no protocol (no https://)
    ],
  },
  plugins: [react(), tailwindcss()],
})
