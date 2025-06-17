import { type ModelCapability } from "@/config/models";
import {
  CpuChipIcon,
  DocumentIcon,
  EyeIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import React from "react";

export const CapabilityIcon = React.memo(({ capability }: { capability: ModelCapability }) => {
  const iconMap = {
    image: <EyeIcon className="h-4 w-4 text-blue-500" />,
    pdf: <DocumentIcon className="h-4 w-4 text-red-500" />,
    search: <MagnifyingGlassIcon className="h-4 w-4 text-green-500" />,
    reasoning: <CpuChipIcon className="h-4 w-4 text-purple-500" />,
    "image-generation": <PhotoIcon className="h-4 w-4 text-orange-500" />,
  };
  return iconMap[capability] || null;
});

CapabilityIcon.displayName = "CapabilityIcon";
