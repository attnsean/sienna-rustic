"use client";

import { useEffect } from "react";

export default function ClientSecurity() {
  useEffect(() => {
    // Only apply security restrictions if NOT running on localhost
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return;
    }

    // 1. Prevent Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 2. Prevent Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent F12
      if (e.key === "F12") {
        e.preventDefault();
      }
      
      const key = e.key.toLowerCase();
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isCmdAlt = e.metaKey && e.altKey;
      const isCtrlShift = e.ctrlKey && e.shiftKey;

      // Prevent Ctrl+Shift+I / Cmd+Option+I (Inspector)
      if ((isCtrlShift || isCmdAlt) && key === "i") {
        e.preventDefault();
      }

      // Prevent Ctrl+Shift+J / Cmd+Option+J (Console)
      if ((isCtrlShift || isCmdAlt) && key === "j") {
        e.preventDefault();
      }

      // Prevent Ctrl+Shift+C / Cmd+Option+C (Element Selector)
      if ((isCtrlShift || isCmdAlt) && key === "c") {
        e.preventDefault();
      }

      // Prevent Ctrl+U / Cmd+U (View Source)
      if (isCmdOrCtrl && key === "u") {
        e.preventDefault();
      }
      
      // Prevent Ctrl+S / Cmd+S (Save Page)
      if (isCmdOrCtrl && key === "s") {
          e.preventDefault();
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return null;
}
