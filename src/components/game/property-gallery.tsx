"use client";

import { ChevronLeft, ChevronRight, ImageOff, Maximize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/cn";
import { sizedImage, srcSetFor } from "@/lib/images";

/**
 * Photo gallery — the hero of every round.
 * Native scroll-snap carousel (swipe on touch, smooth on desktop), counter,
 * thumbnails, keyboard arrows, fullscreen lightbox with click-to-zoom, lazy
 * loading and graceful broken-image fallback. Images are displayed from their
 * source URLs; nothing is proxied.
 */
export function PropertyGallery({
  images,
  label,
  className,
  showThumbs = true,
  globalKeys = false,
  onImageError,
  fit = "cover",
}: {
  images: string[];
  label: string;
  className?: string;
  showThumbs?: boolean;
  globalKeys?: boolean;
  onImageError?: (index: number) => void;
  fit?: "cover" | "contain";
}) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const count = images.length;

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      <Carousel
        images={images}
        label={label}
        index={index}
        onIndex={setIndex}
        globalKeys={globalKeys && !fullscreen}
        onImageError={onImageError}
        fit={fit}
        className="min-h-0 flex-1 rounded-xl"
        overlay={
          <>
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5 text-caption font-bold text-white tnum backdrop-blur-sm">
              {index + 1} / {count}
            </div>
            <div className="absolute top-3 right-3">
              <IconButton label="View fullscreen" tone="glass" onClick={() => setFullscreen(true)}>
                <Maximize2 className="size-4.5" />
              </IconButton>
            </div>
          </>
        }
      />
      {showThumbs && count > 1 && (
        <div className="hidden md:block">
          <Thumbnails images={images} index={index} onSelect={setIndex} />
        </div>
      )}
      <Modal open={fullscreen} onClose={() => setFullscreen(false)} title={`${label} — photos`} variant="fullscreen">
        <Carousel images={images} label={label} index={index} onIndex={setIndex} globalKeys fit="contain" zoomable className="h-full w-full" overlay={
          <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-body-sm font-bold text-white tnum">
            {index + 1} / {count}
          </div>
        } />
      </Modal>
    </div>
  );
}

function Carousel({
  images,
  label,
  index,
  onIndex,
  globalKeys,
  onImageError,
  fit,
  zoomable,
  overlay,
  className,
}: {
  images: string[];
  label: string;
  index: number;
  onIndex: (i: number) => void;
  globalKeys?: boolean;
  onImageError?: (index: number) => void;
  fit: "cover" | "contain";
  zoomable?: boolean;
  overlay?: React.ReactNode;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState<Set<number>>(new Set());
  const count = images.length;
  const internalIndex = useRef(index);

  const goTo = useCallback(
    (i: number) => {
      const el = scroller.current;
      if (!el) return;
      const next = Math.max(0, Math.min(count - 1, i));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: next * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    },
    [count],
  );

  // External index changes (thumbnails, lightbox) scroll the carousel.
  useEffect(() => {
    if (index !== internalIndex.current) goTo(index);
  }, [index, goTo]);

  // Open at the current photo without animation.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = index * el.clientWidth;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!globalKeys) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight") goTo(internalIndex.current + 1);
      if (e.key === "ArrowLeft") goTo(internalIndex.current - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [globalKeys, goTo]);

  const onScroll = () => {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== internalIndex.current) {
      internalIndex.current = i;
      onIndex(i);
    }
  };

  return (
    <div
      className={cn("group relative overflow-hidden bg-surface-dark", className)}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
    >
      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            goTo(internalIndex.current + 1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            goTo(internalIndex.current - 1);
          }
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scrollbar-none focus-visible:outline-none"
      >
        {images.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative h-full w-full shrink-0 snap-center snap-always"
            role="group"
            aria-roledescription="slide"
            aria-label={`Photo ${i + 1} of ${count}`}
          >
            {failed.has(i) ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-text-inverse-muted">
                <ImageOff className="size-8" aria-hidden />
                <span className="text-body-sm">This photo didn&apos;t load</span>
              </div>
            ) : zoomable ? (
              <ZoomableImage src={src} alt={`${label}, photo ${i + 1}`} eager={Math.abs(i - index) <= 1} />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sizedImage(src, 1280)}
                srcSet={srcSetFor(src)}
                sizes="(min-width: 1024px) 66vw, 100vw"
                alt={`${label}, photo ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                draggable={false}
                onLoad={() => setLoaded((s) => new Set(s).add(i))}
                onError={() => {
                  setFailed((s) => new Set(s).add(i));
                  onImageError?.(i);
                }}
                className={cn(
                  "absolute inset-0 h-full w-full select-none transition-opacity duration-(--duration-slow) ease-out",
                  fit === "cover" ? "object-cover" : "object-contain",
                  loaded.has(i) ? "opacity-100" : "opacity-0",
                )}
              />
            )}
            {!loaded.has(i) && !failed.has(i) && !zoomable && <div className="skeleton-dark absolute inset-0 -z-0" aria-hidden />}
          </div>
        ))}
      </div>

      {count > 1 && (
        <>
          <div className="absolute top-1/2 left-3 hidden -translate-y-1/2 opacity-0 transition-opacity duration-(--duration-medium) group-hover:opacity-100 focus-within:opacity-100 md:block">
            <IconButton label="Previous photo" tone="glass" onClick={() => goTo(index - 1)} disabled={index === 0}>
              <ChevronLeft className="size-5" />
            </IconButton>
          </div>
          <div className="absolute top-1/2 right-3 hidden -translate-y-1/2 opacity-0 transition-opacity duration-(--duration-medium) group-hover:opacity-100 focus-within:opacity-100 md:block">
            <IconButton label="Next photo" tone="glass" onClick={() => goTo(index + 1)} disabled={index === count - 1}>
              <ChevronRight className="size-5" />
            </IconButton>
          </div>
        </>
      )}
      {overlay}
    </div>
  );
}

function ZoomableImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sizedImage(src, 1920)}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      draggable={false}
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
        setZoom((z) => !z);
      }}
      onMouseMove={(e) => {
        if (!zoom) return;
        const r = e.currentTarget.getBoundingClientRect();
        setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
      }}
      style={{ transformOrigin: origin, touchAction: "pinch-zoom" }}
      className={cn(
        "absolute inset-0 h-full w-full select-none object-contain transition-transform duration-(--duration-medium) ease-out",
        zoom ? "scale-[2.2] cursor-zoom-out" : "cursor-zoom-in",
      )}
    />
  );
}

function Thumbnails({ images, index, onSelect }: { images: string[]; index: number; onSelect: (i: number) => void }) {
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = list.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
  }, [index]);
  return (
    <div ref={list} className="flex shrink-0 gap-2 overflow-x-auto p-1 scrollbar-none" role="tablist" aria-label="Choose photo">
      {images.map((src, i) => (
        <button
          key={`${src}-${i}`}
          type="button"
          role="tab"
          aria-selected={i === index}
          aria-label={`Photo ${i + 1}`}
          onClick={() => onSelect(i)}
          className={cn(
            "relative h-14 w-20 shrink-0 overflow-hidden rounded-sm bg-surface-muted transition-[opacity,outline-color] duration-(--duration-fast) md:h-16 md:w-24",
            i === index ? "outline-3 outline-offset-2 outline-accent" : "opacity-60 hover:opacity-100",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={sizedImage(src, 320)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        </button>
      ))}
    </div>
  );
}
