import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { I18nProvider } from "./i18n";
import { POLICY_PATH, PolicyView } from "./views/PolicyView";
import "./styles.css";

// ポリシーページは別タブで開かれる読み物なので、ガチャ本体ｓは出さない
const isPolicy = window.location.pathname.replace(/\/$/, "") === POLICY_PATH;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      {isPolicy ? (
        <main className="main">
          <PolicyView />
        </main>
      ) : (
        <App />
      )}
    </I18nProvider>
  </StrictMode>,
);
