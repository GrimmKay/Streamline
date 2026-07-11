import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Self-hosted fonts — bundled into the app at build time via @fontsource,
// instead of the app's old <style> tags pulling from fonts.googleapis.com
// over the network. This is what makes the app genuinely work offline:
// previously, a fresh install with no internet connection on first launch
// could render with fallback system fonts (or fail to load them at all)
// since the font files themselves were never part of the app bundle.
// Run `npm install @fontsource/inter @fontsource/dm-mono @fontsource/dancing-script`
// before this will resolve — see README for the full explanation.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/dancing-script/600.css";
import "@fontsource/dancing-script/700.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
