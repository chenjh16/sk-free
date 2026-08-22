import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

function RedirectNotice() {
  return (
    <p>
      正在前往 <a href="./broadcast/">Sk-free API Broadcast</a>
    </p>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RedirectNotice />
  </StrictMode>,
);
