"use client";

import { themeOptions, useUserPreferencesStore } from "@/stores/user-preferences-store";
import { Button, Input, Textarea } from "@heroui/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface CustomizationTabProps {
  isMounted: boolean;
}

export function CustomizationTab({ isMounted }: CustomizationTabProps) {
  const { theme, setTheme } = useTheme();
  const { assistantName, setAssistantName, userTraits, setUserTraits } = useUserPreferencesStore();
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
          <label className="mb-4 block text-sm font-semibold text-foreground">Theme</label>
          <div className="flex flex-wrap gap-3">
            {!isMounted &&
              themeOptions.map((option) => (
                <div key={option.key} className="h-10 w-24 animate-pulse rounded-lg bg-content2" />
              ))}
            {isMounted &&
              themeOptions.map((themeOption) => (
                <Button
                  key={themeOption.key}
                  variant={theme === themeOption.key ? "solid" : "bordered"}
                  onPress={() => setTheme(themeOption.key)}
                  color={theme === themeOption.key ? "primary" : "default"}
                  className="capitalize"
                  startContent={<span className="text-lg">{themeOption.icon}</span>}
                >
                  {themeOption.label}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
