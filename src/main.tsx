import * as React from "react";
import * as ReactDOMClient from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (typeof window !== "undefined") {
  const globalObject = window as unknown as {
    React?: typeof React;
    ReactDOM?: typeof ReactDOMClient;
  };

  if (!globalObject.React) {
    globalObject.React = React;
  }

  if (!globalObject.ReactDOM) {
    globalObject.ReactDOM = ReactDOMClient;
  }
}

ReactDOMClient.createRoot(document.getElementById("root")!).render(<App />);
