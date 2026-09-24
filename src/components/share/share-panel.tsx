"use client";

import { Copy, Download, Share2 } from "lucide-react";
import { useState } from "react";
import { trackClient } from "@/analytics/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/** COPY · SHARE · SAVE IMAGE — Web Share API where available, graceful fallbacks elsewhere. */
export function SharePanel({ text, url, imageUrl, fileName }: { text: string; url: string; imageUrl: string; fileName: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<"share" | "image" | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    trackClient("share_clicked", { method: "copy" });
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied. Go brag.", "success");
    } catch {
      toast("Couldn't copy — select the text instead.", "error");
    }
  };

  const share = async () => {
    trackClient("share_clicked", { method: "native" });
    setBusy("share");
    try {
      await navigator.share({ title: "HOWMUCH?", text, url });
    } catch {
      /* dismissed */
    } finally {
      setBusy(null);
    }
  };

  const saveImage = async () => {
    trackClient("share_clicked", { method: "image" });
    setBusy("image");
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("image");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "HOWMUCH?" }).catch(() => {});
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    } catch {
      toast("Couldn't create the image. Try again.", "error");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <pre className="overflow-x-auto rounded-lg bg-surface-dark-raised p-5 font-sans text-body-sm leading-relaxed whitespace-pre-wrap text-text-inverse" aria-label="Share text">
        {text}
      </pre>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Button variant="inverse" size="lg" onClick={copy} icon={<Copy className="size-4" aria-hidden />} data-testid="share-copy">
          Copy
        </Button>
        {canShare && (
          <Button variant="primary" size="lg" onClick={share} loading={busy === "share"} icon={<Share2 className="size-4" aria-hidden />}>
            Share
          </Button>
        )}
        <Button variant="ghost-inverse" size="lg" onClick={saveImage} loading={busy === "image"} icon={<Download className="size-4" aria-hidden />} className={canShare ? "" : "sm:col-span-2"}>
          Save image
        </Button>
      </div>
    </div>
  );
}
