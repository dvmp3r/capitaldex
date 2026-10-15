import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { useGame } from "./store/gameStore";

// Solo en desarrollo: acceso al estado desde la consola (p. ej. forzar una noticia).
if (import.meta.env.DEV) (window as unknown as { __game?: typeof useGame }).__game = useGame;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
