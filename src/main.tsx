import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom"; // tambah ini
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter> {/* bungkus App pake ini */}
      <App />
    </BrowserRouter>
  </StrictMode>
);