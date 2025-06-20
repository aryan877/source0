"use client";

import { motion } from "framer-motion";
import { memo } from "react";

export const StreamingIndicator = memo(() => (
  <div className="w-full max-w-full overflow-hidden">
    <div className="flex gap-4">
      <div className="flex max-w-[75%] flex-col items-start gap-2">
        <div className="px-1 py-2">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((index) => (
                <motion.div
                  key={index}
                  className="h-1 w-1 rounded-full bg-primary/60"
                  animate={{
                    opacity: [0.4, 1, 0.4],
                    scale: [1, 1.3, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: index * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
));

StreamingIndicator.displayName = "StreamingIndicator";
