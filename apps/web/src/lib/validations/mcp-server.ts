import { z } from "zod";

export const mcpServerHeaderSchema = z.object({
  id: z.string(),
  key: z.string().min(1, { message: "Header key is required" }),
  value: z.string().min(1, { message: "Header value is required" }),
});

export const mcpServerSchema = z.object({
  name: z.string().min(1, { message: "Server name is required" }),
  url: z.string().url({ message: "Please enter a valid URL" }),
  transport: z.enum(["http", "sse"]),
  headers: z.array(mcpServerHeaderSchema),
  isActive: z.boolean(),
});

export type McpServerFormValues = z.infer<typeof mcpServerSchema>;
