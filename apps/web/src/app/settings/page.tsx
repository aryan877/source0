"use client";

import { usePreviousRoute } from "@/hooks/use-previous-route";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { Button, Spinner, Tab, Tabs } from "@heroui/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type Key } from "react";
import { ApiKeysTab } from "./components/api-keys-tab";
import { AttachmentsTab } from "./components/attachments-tab";
import { CustomizationTab } from "./components/customization-tab";
import { GeneralTab } from "./components/general-tab";
import { McpServersTab } from "./components/mcp-servers-tab";
import { ModelsTab } from "./components/models-tab";
import { UsageTab } from "./components/usage-tab";

function SettingsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { getBackPath } = usePreviousRoute();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const selectedTab = searchParams.get("tab") || "customization";

  const handleTabChange = (key: Key) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", String(key));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handleBack = () => {
    const backPath = getBackPath();
    router.push(backPath);
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center gap-4 border-b border-divider bg-content1/80 p-6 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="light"
            isIconOnly
            onPress={handleBack}
            className="transition-all hover:scale-105"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </Button>
        </div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto overscroll-contain">
        <div className="isolate z-0 mx-auto max-w-5xl p-6">
          <Tabs
            selectedKey={selectedTab}
            onSelectionChange={handleTabChange}
            className="w-full"
            variant="underlined"
            color="primary"
            size="lg"
            radius="lg"
            classNames={{
              base: "w-full",
              tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider",
              cursor: "w-full bg-primary",
              tab: "max-w-fit px-0 h-12",
              tabContent: "group-data-[selected=true]:text-primary font-medium text-base",
              panel: "pt-8",
            }}
          >
            <Tab key="customization" title="Customization">
              <CustomizationTab isMounted={isMounted} />
            </Tab>

            <Tab key="models" title="Models">
              <ModelsTab />
            </Tab>

            <Tab key="attachments" title="Attachments">
              <AttachmentsTab />
            </Tab>

            <Tab key="mcp-servers" title="MCP Servers">
              <McpServersTab />
            </Tab>

            <Tab key="usage" title="Usage">
              <UsageTab />
            </Tab>

            <Tab key="api-keys" title="API Keys">
              <ApiKeysTab />
            </Tab>

            <Tab key="general" title="General">
              <GeneralTab />
            </Tab>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-8">
          <Spinner size="lg" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
