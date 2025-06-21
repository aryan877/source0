"use client";

import { ProviderIcon } from "@/components/chat/provider-icon";
import { getApiKeySchema } from "@/lib/validations/api-keys";
import { useApiKeysStore, type SupportedProvider } from "@/stores/api-keys-store";
import { EyeIcon, EyeSlashIcon, TrashIcon } from "@heroicons/react/24/outline";
import { addToast, Alert, Button, Card, CardBody, Input, Switch } from "@heroui/react";
import { useEffect, useMemo, useState } from "react";

export function ApiKeysTab() {
  const {
    apiKeys,
    globalByokEnabled,
    setApiKey,
    removeApiKey,
    setGlobalByokEnabled,
    isProviderKeySet,
    getSupportedProviders,
    clearAllKeys,
  } = useApiKeysStore();

  const [showApiKeys, setShowApiKeys] = useState<Record<SupportedProvider, boolean>>(
    {} as Record<SupportedProvider, boolean>
  );
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<SupportedProvider, string>>(
    {} as Record<SupportedProvider, string>
  );

  const supportedProviders = useMemo(() => getSupportedProviders(), [getSupportedProviders]);

  useEffect(() => {
    setApiKeyInputs(apiKeys);
  }, [apiKeys]);

  const handleApiKeyChange = (provider: SupportedProvider, value: string) => {
    setApiKeyInputs((prev) => ({ ...prev, [provider]: value }));
  };

  const handleSaveApiKey = (provider: SupportedProvider) => {
    const key = apiKeyInputs[provider];
    if (!key || !key.trim()) {
      addToast({
        title: "Error",
        description: "API key cannot be empty.",
        color: "danger",
      });
      return;
    }

    const schema = getApiKeySchema(provider);
    const validationResult = schema.safeParse(key.trim());

    if (!validationResult.success) {
      addToast({
        title: "Invalid API Key",
        description: validationResult.error.errors[0]?.message || "Invalid format.",
        color: "danger",
      });
    } else {
      if (typeof validationResult.data === "string") {
        setApiKey(provider, validationResult.data);
        addToast({
          title: "API Key Saved",
          description: `Your ${provider} API key has been saved.`,
          color: "success",
        });
      }
    }
  };

  const handleRemoveApiKey = (provider: SupportedProvider) => {
    removeApiKey(provider);
    setApiKeyInputs((prev) => ({ ...prev, [provider]: "" }));
    addToast({
      title: "API Key Removed",
      description: `Your ${provider} API key has been removed.`,
      color: "warning",
    });
  };

  const handleToggleShowApiKey = (provider: SupportedProvider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleClearAllKeys = () => {
    clearAllKeys();
    setApiKeyInputs({} as Record<SupportedProvider, string>);
    addToast({
      title: "All Keys Cleared",
      description: "All personal API keys have been removed.",
      color: "warning",
    });
  };
  return (
    <div className="space-y-8">
      <Alert>
        <div className="flex items-center">
          <span className="ml-2 text-sm">
            Your API keys are stored securely in your browser&apos;s local storage and are are sent
            to our server on per request basis.
          </span>
        </div>
      </Alert>
      <div>
        <h3 className="mb-2 text-xl font-bold text-foreground">Bring Your Own Key (BYOK)</h3>
        <p className="mb-6 text-sm text-default-600">
          Use your own API keys for certain providers. When enabled, your keys will be used instead
          of the default ones.
        </p>
        <div className="flex items-center justify-between rounded-xl border border-divider p-4">
          <div>
            <label className="text-sm font-semibold text-foreground">
              Enable Bring Your Own Key
            </label>
            <p className="mt-1 text-sm text-default-600">
              Globally enable or disable using your own keys.
            </p>
          </div>
          <Switch
            isSelected={globalByokEnabled}
            onValueChange={(isSelected) => {
              setGlobalByokEnabled(isSelected);
              addToast({
                title: "Setting Changed",
                description: `Bring Your Own Key is now ${isSelected ? "enabled" : "disabled"}.`,
                color: "primary",
              });
            }}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="mb-4 text-lg font-bold text-foreground">Provider API Keys</h3>
          <Button
            variant="light"
            color="danger"
            size="sm"
            onPress={handleClearAllKeys}
            startContent={<TrashIcon className="h-4 w-4" />}
          >
            Clear All Keys
          </Button>
        </div>

        <div className="space-y-6">
          {supportedProviders.map((provider) => (
            <Card key={provider} className="border border-divider">
              <CardBody className="p-4">
                <div className="flex items-center gap-4">
                  <ProviderIcon provider={provider} className="h-8 w-8" />
                  <div className="flex-1">
                    <p className="font-semibold">{provider}</p>
                    <p className="text-xs text-default-500">
                      {isProviderKeySet(provider) ? "API key is set." : "Using default key."}
                    </p>
                  </div>
                </div>
                <div className="mt-4">
                  <Input
                    type={showApiKeys[provider] ? "text" : "password"}
                    label={`${provider} API Key`}
                    placeholder={`Enter your ${provider} API key`}
                    value={apiKeyInputs[provider] || ""}
                    onValueChange={(value) => handleApiKeyChange(provider, value)}
                    variant="bordered"
                    endContent={
                      <div className="flex items-center gap-2">
                        <Button
                          isIconOnly
                          variant="light"
                          size="sm"
                          onPress={() => handleToggleShowApiKey(provider)}
                        >
                          {showApiKeys[provider] ? (
                            <EyeSlashIcon className="h-5 w-5 text-default-500" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-default-500" />
                          )}
                        </Button>
                      </div>
                    }
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={() => handleSaveApiKey(provider)}
                      isDisabled={!apiKeyInputs[provider]?.trim()}
                    >
                      Save Key
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="danger"
                      onPress={() => handleRemoveApiKey(provider)}
                      isDisabled={!isProviderKeySet(provider)}
                    >
                      Remove Key
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
