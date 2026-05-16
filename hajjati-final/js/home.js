import { initShell } from "./app.js";

document.addEventListener("DOMContentLoaded", () => {
  initShell({ scope: "public", active: "home" });
});
