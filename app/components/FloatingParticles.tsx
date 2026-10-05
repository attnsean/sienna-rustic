"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function FloatingParticles() {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; size: number; duration: number; delay: number; drift: number }[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const newParticles = [];
      for (let i = 0; i < 40; i++) {
        newParticles.push({
          id: i,
          x: Math.random() * 100, // 0 to 100% width
          y: Math.random() * 100, // 0 to 100% height
          size: Math.random() * 3 + 1, // 1px to 4px
          duration: Math.random() * 20 + 15, // 15 to 35 seconds
          delay: Math.random() * 10,
          drift: Math.random() * 20 - 10,
        });
      }
      setParticles(newParticles);
      setMounted(true);
    });
  }, []);

  if (!mounted) return <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden mix-blend-screen opacity-60"></div>;

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden mix-blend-screen opacity-60">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-[#d4af37] blur-[1px]"
          style={{ width: p.size, height: p.size, left: `${p.x}%`, top: `${p.y}%` }}
          animate={{
            y: ["0%", "-100vh"],
            x: ["0%", `${p.drift}%`],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "linear",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
