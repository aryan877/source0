"use client";

import { ProviderIcon } from "@/components/chat/provider-icon";
import { PROVIDER_MAPPING, type Provider } from "@/config/models";
import {
  useClearAllApiKeys,
  useRemoveApiKey,
  useSetApiKey,
  useSetByokSettings,
  useToggleProvider,
  useUserApiKeys,
  useUserByokSettings,
} from "@/hooks/queries/use-user-api-keys";
import { getApiKeySchema } from "@/lib/validations/api-keys";
import { EyeIcon, EyeSlashIcon, TrashIcon } from "@heroicons/react/24/outline";
import { addToast, Alert, Button, Card, CardBody, Input, Switch } from "@heroui/react";
import { useMemo, useState } from "react";

export type SupportedProvider = Provider;

export function ApiKeysTab() {
  const [showApiKeys, setShowApiKeys] = useState<Partial<Record<SupportedProvider, boolean>>>({});
  const [apiKeyInputs, setApiKeyInputs] = useState<Partial<Record<SupportedProvider, string>>>({});

  const supportedProviders = useMemo(() => {
    return Object.keys(PROVIDER_MAPPING).filter(
      (provider) => PROVIDER_MAPPING[provider as SupportedProvider].supported
    ) as SupportedProvider[];
  }, []);

  // Hooks
  const { data: apiKeysData = [] } = useUserApiKeys();
  const { data: byokSettings } = useUserByokSettings();
  const setApiKeyMutation = useSetApiKey();
  const removeApiKeyMutation = useRemoveApiKey();
  const setByokMutation = useSetByokSettings();
  const clearAllKeysMutation = useClearAllApiKeys();
  const toggleProviderMutation = useToggleProvider();

  // Transform API keys data for easier access
  const apiKeysMap = useMemo(() => {
    const map: Record<string, { key: string; enabled: boolean }> = {};
    apiKeysData.forEach(
      (key: {
        provider?: string | null;
        api_key_encrypted?: string | null;
        is_enabled?: boolean | null;
      }) => {
        if (key.provider) {
          map[key.provider] = {
            key: key.api_key_encrypted || "",
            enabled: key.is_enabled ?? true,
          };
        }
      }
    );
    return map;
  }, [apiKeysData]);

  // Handlers
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
      return;
    }

    setApiKeyMutation.mutate({ provider, key: validationResult.data });
  };

  const handleRemoveApiKey = (provider: SupportedProvider) => {
    removeApiKeyMutation.mutate(provider, {
      onSuccess: () => {
        setApiKeyInputs((prev) => ({ ...prev, [provider]: "" }));
      },
    });
  };

  const handleToggleShowApiKey = (provider: SupportedProvider) => {
    setShowApiKeys((prev) => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleClearAllKeys = () => {
    clearAllKeysMutation.mutate(undefined, {
      onSuccess: () => {
        setApiKeyInputs({} as Partial<Record<SupportedProvider, string>>);
      },
    });
  };

  const isProviderKeySet = (provider: SupportedProvider) => {
    return !!apiKeysMap[provider]?.key?.trim();
  };

  const isProviderEnabled = (provider: SupportedProvider) => {
    return apiKeysMap[provider]?.enabled ?? true;
  };

  return (
    <div className="space-y-8">
      <Alert>
        <div className="flex items-center">
          <span className="ml-2 text-sm">
            Your API keys are stored securely in the database and are encrypted at rest.
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
            isSelected={byokSettings?.global_byok_enabled || false}
            onValueChange={(isSelected) => {
              setByokMutation.mutate({
                enabled: isSelected,
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
                    value={apiKeyInputs[provider] ?? apiKeysMap[provider]?.key ?? ""}
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

                  {/* Provider-level toggle - only show if provider has API key */}
                  {isProviderKeySet(provider) && (
                    <div className="mt-4 border-t border-divider pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-foreground">
                            Enable {provider}
                          </h4>
                          <p className="text-xs text-default-500">
                            Toggle to enable/disable all {provider} models at once.
                          </p>
                        </div>
                        <Switch
                          isSelected={isProviderEnabled(provider)}
                          onValueChange={(checked) => {
                            toggleProviderMutation.mutate({
                              provider,
                              enabled: checked,
                            });
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
