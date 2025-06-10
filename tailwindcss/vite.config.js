import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  server: {
    host: true, // 👈 allow external access (e.g., from phone)
    port: 5174,
    allowedHosts: [
      '2f6c-2405-201-15-20ef-c15f-2b15-a9a3-d9f7.ngrok-free.app' // ✅ no protocol (no https://)
    ],
  },
  plugins: [react(), tailwindcss()],
})
