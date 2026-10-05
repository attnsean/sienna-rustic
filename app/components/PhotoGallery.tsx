'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

const images = [
  "https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1519225495810-7517c24a2ed3?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1515934751635-c81c6bc9a2d8?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=800&auto=format&fit=crop"
];

export default function PhotoGallery() {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="w-full min-h-[100dvh] bg-neutral-950 py-16 px-6 relative z-10 font-sans">
      <div className="text-center mb-10">
        <h2 className="text-4xl text-[#d4af37] font-serif tracking-widest mb-2">Our Moments</h2>
        <p className="text-white/60 text-sm tracking-widest uppercase">Glimpses of forever</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
        {images.map((img, i) => (
          <motion.div
            key={i}
            layoutId={`photo-${i}`}
            onClick={() => setSelectedId(i)}
            className="cursor-pointer overflow-hidden rounded-md relative aspect-square"
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <Image
              src={img}
              alt={`Album ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedId(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 cursor-zoom-out"
          >
            <motion.div
              layoutId={`photo-${selectedId}`}
              className="relative w-full max-w-4xl max-h-[90vh] aspect-auto"
            >
              <Image
                src={images[selectedId]}
                alt={`Album ${selectedId + 1}`}
                width={1200}
                height={1200}
                className="object-contain w-full h-full max-h-[90vh]"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

