"use client";

import { ProviderIcon } from "@/components/chat/provider-icon";
import { MODELS, PROVIDERS, Provider } from "@/config/models";
import { UsageLogsFilters, useUsageLogs } from "@/hooks/queries/use-usage-logs";
import { useUsageStats } from "@/hooks/queries/use-usage-stats";
import { ModelUsageLog } from "@/services/usage-logs";
import {
  ArrowPathIcon,
  ChartBarIcon,
  ClockIcon,
  CpuChipIcon,
  DocumentTextIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import {
  Alert,
  Autocomplete,
  AutocompleteItem,
  Button,
  Card,
  CardBody,
  Chip,
  DatePicker,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { parseDate } from "@internationalized/date";
import { useState } from "react";

function formatNumber(num: number) {
  return new Intl.NumberFormat().format(num);
}

function formatTokens(tokens: number) {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  isLoading?: boolean;
}) => (
  <div className="rounded-xl border border-divider p-4">
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-default-100">
        <div className="text-default-600">{icon}</div>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-default-600">{title}</p>
        {isLoading ? (
          <div className="mt-1 h-6 w-16 animate-pulse rounded bg-default-200" />
        ) : (
          <p className="text-2xl font-bold text-foreground">{value}</p>
        )}
        {subtitle && !isLoading && <p className="text-xs text-default-500">{subtitle}</p>}
      </div>
    </div>
  </div>
);

// Quick filter presets
const quickFilters = [
  {
    name: "Today",
    icon: <ClockIcon className="h-4 w-4" />,
    getFilters: () => ({ startDate: new Date().toISOString().split("T")[0] }),
  },
  {
    name: "Last 7 days",
    icon: <ChartBarIcon className="h-4 w-4" />,
    getFilters: () => {
      const date = new Date();
      date.setDate(date.getDate() - 7);
      return { startDate: date.toISOString().split("T")[0] };
    },
  },
  {
    name: "Last 30 days",
    icon: <DocumentTextIcon className="h-4 w-4" />,
    getFilters: () => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return { startDate: date.toISOString().split("T")[0] };
    },
  },
];

function isKnownProvider(provider: string): provider is Provider {
  return PROVIDERS.includes(provider as Provider);
}

// Helper function to safely convert date string to CalendarDate or return null
const createDateValue = (dateString: string | undefined) => {
  if (!dateString) return null;
  try {
    return parseDate(dateString);
  } catch {
    return null;
  }
};

export function UsageTab() {
  const [filters, setFilters] = useState<UsageLogsFilters>({ pageSize: 10 });

  const {
    usageLogs,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useUsageLogs(filters);

  const {
    data: stats,
    isFetching: isStatsFetching,
    refetch: refetchStats,
  } = useUsageStats(filters);

  const filteredModels = filters.provider
    ? MODELS.filter((model) => model.provider === filters.provider)
    : MODELS;

  const handleFilterChange = (
    key: "startDate" | "endDate" | "provider" | "modelId",
    value: string | undefined | null
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      if (value) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }

      // When the provider filter changes, reset the model filter
      if (key === "provider") {
        delete newFilters.modelId;
      }

      // When model is selected, auto-fill the provider, or clear provider when model is cleared
      if (key === "modelId") {
        if (value) {
          const selectedModel = MODELS.find((model) => model.id === value);
          if (selectedModel) {
            newFilters.provider = selectedModel.provider;
          }
        } else {
          delete newFilters.provider;
        }
      }

      return newFilters;
    });
  };

  const handleQuickFilter = (getQuickFilters: () => Partial<UsageLogsFilters>) => {
    const quickFilters = getQuickFilters();
    setFilters((prev) => ({
      ...prev,
      ...quickFilters,
    }));
  };

  const clearFilters = () => {
    setFilters({ pageSize: 10 });
  };

  const hasActiveFilters = Object.keys(filters).some((key) => key !== "pageSize");

  const columns = [
    { key: "model", name: "Model" },
    { key: "prompt", name: "Prompt" },
    { key: "completion", name: "Completion" },
    { key: "total", name: "Total" },
    { key: "date", name: "Date" },
  ];

  const renderCell = (log: ModelUsageLog, columnKey: React.Key) => {
    switch (columnKey) {
      case "model":
        return (
          <div className="flex items-center gap-3">
            {isKnownProvider(log.provider) ? (
              <ProviderIcon provider={log.provider} className="h-8 w-8" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-default-200">
                <span className="text-xs font-semibold text-default-600">
                  {log.provider.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{log.model_id}</p>
              <p className="text-xs text-default-500">{log.provider}</p>
            </div>
          </div>
        );
      case "prompt":
        return (
          <div className="text-right">
            <p className="font-mono text-sm font-medium">{formatTokens(log.prompt_tokens)}</p>
            <p className="text-xs text-default-500">{formatNumber(log.prompt_tokens)}</p>
          </div>
        );
      case "completion":
        return (
          <div className="text-right">
            <p className="font-mono text-sm font-medium">{formatTokens(log.completion_tokens)}</p>
            <p className="text-xs text-default-500">{formatNumber(log.completion_tokens)}</p>
          </div>
        );
      case "total":
        return (
          <div className="text-right">
            <Chip color="primary" variant="flat" size="md" className="font-mono font-semibold">
              {formatTokens(log.total_tokens)}
            </Chip>
            <p className="mt-1 text-xs text-default-500">{formatNumber(log.total_tokens)}</p>
          </div>
        );
      case "date":
        return (
          <div className="text-right">
            <p className="text-sm font-medium">
              {log.created_at
                ? new Date(log.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "N/A"}
            </p>
            <p className="text-xs text-default-500">
              {log.created_at
                ? new Date(log.created_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  })
                : ""}
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="mb-2 text-xl font-bold text-foreground">Usage Analytics</h3>
        <p className="text-sm text-default-600">
          Monitor your token consumption and API usage across all models and providers.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Requests"
          value={formatNumber(stats?.total_requests || 0)}
          icon={<ChartBarIcon className="h-5 w-5" />}
          isLoading={isStatsFetching}
        />
        <StatCard
          title="Total Tokens"
          value={formatTokens(stats?.total_tokens || 0)}
          subtitle={formatNumber(stats?.total_tokens || 0)}
          icon={<CpuChipIcon className="h-5 w-5" />}
          isLoading={isStatsFetching}
        />
        <StatCard
          title="Input Tokens"
          value={formatTokens(stats?.total_prompt_tokens || 0)}
          subtitle={`${(
            ((stats?.total_prompt_tokens || 0) / (stats?.total_tokens || 1)) *
            100
          ).toFixed(1)}% of total`}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          isLoading={isStatsFetching}
        />
        <StatCard
          title="Output Tokens"
          value={formatTokens(stats?.total_completion_tokens || 0)}
          subtitle={`${(
            ((stats?.total_completion_tokens || 0) / (stats?.total_tokens || 1)) *
            100
          ).toFixed(1)}% of total`}
          icon={<DocumentTextIcon className="h-5 w-5" />}
          isLoading={isStatsFetching}
        />
      </div>

      {/* Quick Filters */}
      <div className="flex items-center justify-between rounded-xl border border-divider p-4">
        <div className="flex items-center gap-3">
          <FunnelIcon className="h-5 w-5 text-default-600" />
          <span className="text-sm font-semibold text-foreground">Quick Filters</span>
          {hasActiveFilters && (
            <Chip size="sm" color="primary" variant="flat">
              {Object.keys(filters).length} active
            </Chip>
          )}
        </div>
        <div className="flex items-center gap-2">
          {quickFilters.map((filter) => (
            <Button
              key={filter.name}
              size="sm"
              variant="flat"
              startContent={filter.icon}
              onPress={() => handleQuickFilter(filter.getFilters)}
            >
              {filter.name}
            </Button>
          ))}
          <Button
            color="primary"
            variant="flat"
            onPress={() => {
              refetch();
              refetchStats();
            }}
            size="sm"
            isDisabled={isFetching || isStatsFetching}
            startContent={
              isFetching || isStatsFetching ? (
                <Spinner size="sm" />
              ) : (
                <ArrowPathIcon className="h-4 w-4" />
              )
            }
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-foreground">Advanced Filters</h4>
          {hasActiveFilters && (
            <Button variant="light" color="danger" onPress={clearFilters} size="sm">
              Clear All Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DatePicker
            label="Start Date"
            value={createDateValue(filters.startDate)}
            onChange={(date) => handleFilterChange("startDate", date ? date.toString() : null)}
            size="sm"
            variant="bordered"
            granularity="day"
          />
          <DatePicker
            label="End Date"
            value={createDateValue(filters.endDate)}
            onChange={(date) => handleFilterChange("endDate", date ? date.toString() : null)}
            size="sm"
            variant="bordered"
            granularity="day"
          />
          <Select
            label="Provider"
            placeholder="All Providers"
            selectedKeys={filters.provider ? [filters.provider] : []}
            onSelectionChange={(keys) =>
              handleFilterChange("provider", (keys as Set<string>).values().next().value)
            }
            size="sm"
            variant="bordered"
          >
            {PROVIDERS.map((provider: string) => (
              <SelectItem
                key={provider}
                startContent={
                  isKnownProvider(provider) ? (
                    <ProviderIcon provider={provider} className="h-4 w-4" />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-default-200">
                      <span className="text-xs font-semibold text-default-600">
                        {provider.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )
                }
              >
                {provider}
              </SelectItem>
            ))}
          </Select>
          <Autocomplete
            label="Model"
            placeholder="All Models"
            selectedKey={filters.modelId || null}
            onSelectionChange={(key) => handleFilterChange("modelId", key as string | null)}
            size="sm"
            variant="bordered"
            isClearable
            allowsCustomValue={false}
            menuTrigger="focus"
          >
            {filteredModels.map((model) => (
              <AutocompleteItem
                key={model.id}
                startContent={
                  isKnownProvider(model.provider) ? (
                    <ProviderIcon provider={model.provider} className="h-4 w-4" />
                  ) : (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-default-200">
                      <span className="text-xs font-semibold text-default-600">
                        {String(model.provider).charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )
                }
                textValue={model.name}
              >
                <div className="flex flex-col">
                  <span className="text-small">{model.name}</span>
                  <span className="text-tiny text-default-400">{model.provider}</span>
                </div>
              </AutocompleteItem>
            ))}
          </Autocomplete>
        </div>
      </div>

      <Divider />

      {/* Error Alert */}
      {isError && (
        <Alert color="danger" className="border-l-4 border-danger">
          <p className="font-medium">Failed to load usage data</p>
          <p className="mt-1 text-sm">{(error as Error).message}</p>
        </Alert>
      )}

      {/* Usage Table */}
      <Card className="border border-divider">
        <CardBody className="p-0">
          <Table
            aria-label="Model usage logs"
            bottomContent={
              hasNextPage && (
                <div className="flex w-full justify-center p-4">
                  <Button onPress={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? "Loading..." : "Load More"}
                  </Button>
                </div>
              )
            }
            classNames={{
              wrapper: "shadow-none",
              th: "bg-default-50 text-default-700 font-semibold",
              td: "py-4",
            }}
          >
            <TableHeader columns={columns}>
              {(column) => (
                <TableColumn
                  key={column.key}
                  className={column.key === "model" ? "text-left" : "text-right"}
                >
                  {column.name}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              items={usageLogs || []}
              isLoading={isLoading}
              loadingContent={
                <div className="flex justify-center py-12">
                  <Spinner size="lg" label="Loading usage data..." />
                </div>
              }
              emptyContent={
                <div className="py-16 text-center">
                  <ChartBarIcon className="mx-auto h-12 w-12 text-default-300" />
                  <h3 className="mt-4 text-lg font-medium text-default-600">No usage data found</h3>
                  <p className="mt-2 text-sm text-default-500">
                    {hasActiveFilters
                      ? "Try adjusting your filters to see more results."
                      : "Start a new chat to begin tracking your usage."}
                  </p>
                  {hasActiveFilters && (
                    <Button
                      variant="flat"
                      color="primary"
                      size="sm"
                      onPress={clearFilters}
                      className="mt-4"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              }
            >
              {(item) => (
                <TableRow key={item.id}>
                  {(columnKey) => <TableCell>{renderCell(item, columnKey)}</TableCell>}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>
    </div>
  );
}
