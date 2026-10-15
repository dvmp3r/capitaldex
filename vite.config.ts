import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "./", // rutas relativas: el build funciona en cualquier carpeta o subruta
  plugins: [react(), tailwindcss()],
});
