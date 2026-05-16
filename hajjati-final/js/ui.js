import { toast } from "./app.js";

export function showToast(message, variant = "info") {
  toast(message, variant);
}

export { toast };
