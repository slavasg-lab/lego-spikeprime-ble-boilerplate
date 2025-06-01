import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import BLEProvider from "./providers/BLEProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BLEProvider>
      <App />
    </BLEProvider>
  </StrictMode>
);
