import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: true, // 👈 allow external access (e.g., from phone)
    port: 5174,
    allowedHosts: [
      '36a8-2401-4900-56d3-624e-500d-6105-78f5-e8c8.ngrok-free.app' // ✅ no protocol (no https://)
    ],
  },
  plugins: [react(), tailwindcss()],
})
