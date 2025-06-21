"use client";

import { SHORTCUTS } from "@/config/shortcuts";
import { useUserPreferencesStore } from "@/stores/user-preferences-store";
import { addToast, Divider, Switch } from "@heroui/react";
import { Kbd } from "./kbd";

export function GeneralTab() {
  const {
    hidePersonalInfo,
    setHidePersonalInfo,
    showSamplePrompts,
    setShowSamplePrompts,
    memoryEnabled,
    setMemoryEnabled,
    suggestQuestions,
    setSuggestQuestions,
    showChatNavigator,
    setShowChatNavigator,
  } = useUserPreferencesStore();

  return (
    <>
      <h3 className="mb-2 text-xl font-bold text-foreground">Interface Options</h3>
      <p className="mb-6 text-sm text-default-600">Customize how the interface behaves</p>
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">
              Hide Personal Information
            </label>
            <p className="mt-1 text-sm text-default-600">Hide name and email from the interface</p>
          </div>
          <Switch
            isSelected={hidePersonalInfo}
            onValueChange={(isSelected) => {
              setHidePersonalInfo(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Personal information is now ${isSelected ? "hidden" : "visible"}.`,
                color: "primary",
              });
            }}
          />
        </div>

        <Divider />

        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Show Sample Prompts</label>
            <p className="mt-1 text-sm text-default-600">Show sample prompts on new chat screens</p>
          </div>
          <Switch
            isSelected={showSamplePrompts}
            onValueChange={(isSelected) => {
              setShowSamplePrompts(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Sample prompts are now ${isSelected ? "shown" : "hidden"}.`,
                color: "primary",
              });
            }}
          />
        </div>

        <Divider />

        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Enable Memory</label>
            <p className="mt-1 text-sm text-default-600">
              Allow AI to save and recall information for personalized conversations
            </p>
          </div>
          <Switch
            isSelected={memoryEnabled}
            onValueChange={(isSelected) => {
              setMemoryEnabled(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Memory is now ${isSelected ? "enabled" : "disabled"}.`,
                color: "primary",
              });
            }}
          />
        </div>

        <Divider />

        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Suggest Questions</label>
            <p className="mt-1 text-sm text-default-600">
              Show AI-suggested follow-up questions after responses
            </p>
          </div>
          <Switch
            isSelected={suggestQuestions}
            onValueChange={(isSelected) => {
              setSuggestQuestions(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Question suggestions are now ${isSelected ? "enabled" : "disabled"}.`,
                color: "primary",
              });
            }}
          />
        </div>

        <Divider />

        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">Enable Chat Navigator</label>
            <p className="mt-1 text-sm text-default-600">
              Show a navigator to quickly jump between key points in the conversation.
            </p>
          </div>
          <Switch
            isSelected={showChatNavigator}
            onValueChange={(isSelected) => {
              setShowChatNavigator(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Chat Navigator is now ${isSelected ? "enabled" : "disabled"}.`,
                color: "primary",
              });
            }}
          />
        </div>
      </div>

      <Divider className="my-8" />

      <div>
        <h3 className="mb-2 text-xl font-bold text-foreground">Keyboard Shortcuts</h3>
        <p className="mb-6 text-sm text-default-600">
          Quickly navigate and perform actions throughout the app.
        </p>
        <div className="space-y-4">
          {SHORTCUTS.map((shortcut) => (
            <div
              key={shortcut.id}
              className="flex items-center justify-between rounded-xl border border-divider p-4"
            >
              <p className="text-sm font-semibold text-foreground">{shortcut.name}</p>
              <div className="flex items-center gap-2">
                {shortcut.display.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
