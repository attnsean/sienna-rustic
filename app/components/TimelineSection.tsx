"use client";
import React from "react";
import FadeIn from "./FadeIn";
import Image from "next/image";

const bgTimeline = "https://www.serastory.com/storage/undangan/templates/onyx-1/timeline-bg.webp";


export interface StoryEvent {
  id?: string;
  year: string;
  title: string;
  desc: string;
  order?: number;
}

interface TimelineSectionProps {
  loveStoryItems?: StoryEvent[] | null;
  bgImage?: string;
}

export default function TimelineSection({ loveStoryItems, bgImage }: TimelineSectionProps) {
  if (loveStoryItems !== undefined && (!loveStoryItems || loveStoryItems.length === 0)) {
    return null;
  }

  const timelineBg = bgImage || bgTimeline;

  const events = loveStoryItems && loveStoryItems.length > 0
    ? [...loveStoryItems].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [
        {
          id: "1",
          year: "2019",
          title: "First Met",
          desc: "Berawal dari perkenalan singkat di sebuah kedai kopi kecil di sudut Jakarta, dua dunia perlahan mulai menyatu.",
          order: 1
        },
        {
          id: "2",
          year: "2021",
          title: "The Spark",
          desc: "Melalui banyak hujan dan kemarau bersama, kami menyadari bahwa tempat ternyaman adalah bersandar pada satu sama lain.",
          order: 2
        },
        {
          id: "3",
          year: "2025",
          title: "The Proposal",
          desc: "Dalam sebuah makan malam sederhana, sebuah cincin tersemat sebagai tanda komitmen untuk melangkah ke cerita selanjutnya.",
          order: 3
        }
      ];

  return (
    <section className="relative w-full min-h-[100dvh] h-auto snap-start shrink-0 overflow-hidden flex flex-col py-24 bg-neutral-950">
      <div className="absolute inset-0 z-0 bg-black">
        <Image
          src={timelineBg}
          alt="Timeline Background"
          fill
          unoptimized={typeof timelineBg === 'string'}
          sizes="(max-width: 768px) 100vw, 30vw"
          className="object-cover object-center opacity-40 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/50 to-black/80"></div>
      </div>

      <div className="relative z-10 w-full flex flex-col items-center px-6 md:px-10">
        <FadeIn>
          <h2 className="text-3xl md:text-4xl font-serif tracking-widest text-white mb-4 text-center">
            OUR STORY
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <p className="text-xs md:text-sm font-sans font-light text-gray-400 text-center max-w-sm mb-16">
            A journey of a thousand miles begins with a single step.
          </p>
        </FadeIn>

        {/* Timeline Container */}
        <div className="relative w-full max-w-md mx-auto">
          {/* Vertical Center Line */}
          <div className="absolute top-0 bottom-0 left-[20px] md:left-1/2 w-[1px] bg-white/20 md:-translate-x-1/2"></div>

          <div className="space-y-16">
            {events.map((event, idx) => {
              const isEven = idx % 2 === 0;
              return (
                <FadeIn
                  key={idx}
                  delay={0.3 + (idx * 0.2)}
                  className={`relative flex items-center md:justify-between w-full ${isEven ? "md:flex-row" : "md:flex-row-reverse"}`}
                >
                  {/* Timeline Dot */}
                  <div className="absolute left-[20px] md:left-1/2 w-3 h-3 rounded-full bg-[#d4af37] border-4 border-neutral-900 -translate-x-[5px] md:-translate-x-1/2 z-10 shadow-[0_0_10px_rgba(212,175,55,0.5)]"></div>

                  {/* Content Space (Desktop: left or right, Mobile: always right) */}
                  <div className="w-full md:w-[45%] pl-14 md:pl-0">
                    <div className={`flex flex-col gap-2 ${isEven ? "md:text-right" : "md:text-left"}`}>
                      <span className="text-[#d4af37] font-script text-2xl md:text-3xl lowercase">{event.year}</span>
                      <h4 className="text-white font-serif tracking-widest uppercase text-base">{event.title}</h4>
                      <p className="text-gray-400 font-sans font-light text-xs leading-relaxed">
                        {event.desc}
                      </p>
                    </div>
                  </div>

                  {/* Empty space for opposite side on desktop */}
                  <div className="hidden md:block w-[45%]"></div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
