"use client";

import {
  FontSizeKey,
  fontSizes,
  themeColorMap,
  themeOptions,
  useUserPreferencesStore,
} from "@/stores/user-preferences-store";
import { CheckIcon } from "@heroicons/react/24/outline";
import { Button, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface CustomizationTabProps {
  isMounted: boolean;
}

export function CustomizationTab({ isMounted }: CustomizationTabProps) {
  const { theme, setTheme } = useTheme();
  const { assistantName, setAssistantName, userTraits, setUserTraits, fontSize, setFontSize } =
    useUserPreferencesStore();
  const [localAssistantName, setLocalAssistantName] = useState(assistantName);
  const [localUserTraits, setLocalUserTraits] = useState(userTraits);

  useEffect(() => {
    setLocalAssistantName(assistantName);
  }, [assistantName]);

  useEffect(() => {
    setLocalUserTraits(userTraits);
  }, [userTraits]);

  const personalInfoHasChanges =
    localAssistantName !== assistantName || localUserTraits !== userTraits;

  const handleSavePersonalInfo = () => {
    setAssistantName(localAssistantName);
    setUserTraits(localUserTraits);
    // addToast is not available here, but was in the original file.
    // This is a side-effect that should be handled in the parent component.
    // For now, I'm just keeping the logic here. The user can decide to move it up.
  };

  const handleResetPersonalInfo = () => {
    setLocalAssistantName(assistantName);
    setLocalUserTraits(userTraits);
  };

  return (
    <>
      <h3 className="mb-6 text-xl font-bold text-foreground">Personal Settings</h3>
      <div className="space-y-6">
        <div>
          <label className="mb-3 block text-sm font-semibold text-foreground">Assistant Name</label>
          <Input
            value={localAssistantName}
            onChange={(e) => setLocalAssistantName(e.target.value)}
            placeholder="What should this app call you?"
            variant="bordered"
          />
          <p className="mt-2 text-sm text-default-600">
            This is how the assistant will address you in conversations.
          </p>
        </div>

        <div>
          <label className="mb-3 block text-sm font-semibold text-foreground">
            Your Traits & Preferences
          </label>
          <Textarea
            value={localUserTraits}
            onChange={(e) => setLocalUserTraits(e.target.value)}
            placeholder="Tell the AI about your preferences, communication style, expertise, etc."
            minRows={4}
            variant="bordered"
          />
          <p className="mt-2 text-sm text-default-600">
            Help the AI understand how to communicate with you effectively.
          </p>
        </div>

        {personalInfoHasChanges && (
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="flat" color="default" onPress={handleResetPersonalInfo}>
              Cancel
            </Button>
            <Button color="primary" onPress={handleSavePersonalInfo}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <h3 className="mb-6 mt-12 text-xl font-bold text-foreground">Appearance</h3>
      <div className="space-y-6">
        <div>
          <label className="mb-4 block text-sm font-semibold text-foreground">Font Size</label>
          <div className="max-w-xs">
            <Select
              selectedKeys={[fontSize]}
              onSelectionChange={(keys) => {
                const selectedKey = Array.from(keys)[0] as FontSizeKey;
                if (selectedKey) {
                  setFontSize(selectedKey);
                }
              }}
              aria-label="Font size selector"
            >
              {fontSizes.map((size) => (
                <SelectItem key={size.key}>{size.label}</SelectItem>
              ))}
            </Select>
          </div>
          <p className="mt-2 text-sm text-default-600">
            Adjusts the font size for the content of chat messages.
          </p>
        </div>
        <div>
          <label className="mb-4 block text-sm font-semibold text-foreground">Theme</label>
          <div className="flex flex-wrap gap-4">
            {!isMounted &&
              themeOptions.map((option) => (
                <div key={option.key} className="h-24 w-16 animate-pulse rounded-lg bg-content2" />
              ))}
            {isMounted &&
              themeOptions.map((themeOption) => {
                const colors = themeColorMap[themeOption.key];
                const isSelected = theme === themeOption.key;
                return (
                  <div
                    key={themeOption.key}
                    onClick={() => setTheme(themeOption.key)}
                    className="flex cursor-pointer flex-col items-center gap-2"
                  >
                    <div className="relative">
                      <div
                        className="h-24 w-16 rounded-xl shadow-lg transition-all duration-300"
                        style={{
                          backgroundColor: colors[0],
                          boxShadow: isSelected
                            ? `0 6px 20px ${colors[0]}50, 0 0 0 3px ${colors[0]}70`
                            : "0 4px 12px rgba(0,0,0,0.1)",
                          transform: isSelected ? "translateY(-4px)" : "none",
                        }}
                      />
                      {isSelected && (
                        <div className="absolute -right-1.5 -top-1.5 rounded-full bg-success p-1 ring-2 ring-content1">
                          <CheckIcon className="h-3 w-3 text-success-foreground" />
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium transition-colors ${
                        isSelected ? "text-primary" : "text-default-600"
                      }`}
                    >
                      {themeOption.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>
    </>
  );
}
