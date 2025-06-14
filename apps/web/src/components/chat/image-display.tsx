"use client";

import Image from "next/image";

interface ImageDisplayProps {
  imageUrl: string;
  prompt: string;
}

export function ImageDisplay({ imageUrl, prompt }: ImageDisplayProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-background p-4">
      <p className="text-muted-foreground text-sm">{prompt}</p>
      <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg">
        <Image src={imageUrl} alt={prompt} layout="fill" className="object-cover" />
      </div>
    </div>
  );
}
