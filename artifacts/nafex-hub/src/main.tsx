import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.info("[PWA] New content available, reloading...");
    window.location.reload();
  },
  onOfflineReady() {
    console.info("[PWA] App ready to work offline");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
