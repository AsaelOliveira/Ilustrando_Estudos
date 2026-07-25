import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyStoredAccent } from "./lib/accent-theme";

// Aplica a cor de destaque salva antes do primeiro render (evita "flash" de cor)
applyStoredAccent();

createRoot(document.getElementById("root")!).render(<App />);
