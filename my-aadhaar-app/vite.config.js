import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: true, // 👈 allow external access (e.g., from phone)
    port: 5174,
    allowedHosts: [
      '0e85-2401-4900-56d3-624e-84a6-13c8-d129-ba05.ngrok-free.app' // ✅ no protocol (no https://)
    ],
  },
  plugins: [react(), tailwindcss()],
})
