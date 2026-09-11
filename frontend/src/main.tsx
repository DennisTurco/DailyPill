import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import { applyTheme, getStoredTheme } from "./lib/theme";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "highlight.js/styles/atom-one-dark.css";
import "./index.css";

applyTheme(getStoredTheme());

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
