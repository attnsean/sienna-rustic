"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function CustomCursor() {
  const [mousePos, setMousePos] = useState({ x: -100, y: -100 });
  const [isPointer, setIsPointer] = useState(false);

  useEffect(() => {
    // Hide cursor on touch devices to avoid ghost cursors
    if (window.matchMedia("(pointer: coarse)").matches) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      const target = e.target as HTMLElement;
      // Get computed style safely
      if (target) {
        const computedStyle = window.getComputedStyle(target);
        const tag = target.tagName?.toLowerCase();
        setIsPointer(
          computedStyle.cursor === "pointer" ||
          tag === "button" ||
          tag === "a" ||
          target.closest("button") !== null ||
          target.closest("a") !== null
        );
      }
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  if (!mounted) return null;

  // Return null if touch device
  if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
    return null;
  }

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 w-3 h-3 rounded-full bg-[#d4af37] pointer-events-none z-[9999] mix-blend-exclusion"
        animate={{
          x: mousePos.x - 6,
          y: mousePos.y - 6,
          scale: isPointer ? 2.5 : 1,
          opacity: mousePos.x > 0 ? 1 : 0
        }}
        transition={{ type: "tween", ease: "backOut", duration: 0.1 }}
      />
      <motion.div
        className="fixed top-0 left-0 w-10 h-10 rounded-full border border-[#d4af37]/50 pointer-events-none z-[9998]"
        animate={{
          x: mousePos.x - 20,
          y: mousePos.y - 20,
          scale: isPointer ? 1.5 : 1,
          opacity: mousePos.x > 0 ? 1 : 0
        }}
        transition={{ type: "tween", ease: "easeOut", duration: 0.4 }}
      />
    </>
  );
}
