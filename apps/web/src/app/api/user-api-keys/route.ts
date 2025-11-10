import { PROVIDERS, type Provider } from "@/config/models";
import { getApiKeySchema } from "@/lib/validations/api-keys";
import {
  clearAllUserApiKeys,
  getUserApiKeys,
  setUserApiKey,
} from "@/services/server/user-api-keys.server";
import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const SetApiKeySchema = z
  .object({
    provider: z.string().refine((p): p is Provider => PROVIDERS.includes(p as Provider), {
      message: "Unsupported provider",
    }),
    apiKey: z.string().min(1, "API key is required"),
  })
  .refine(
    (data) => {
      // Validate API key format for the specific provider
      const providerSchema = getApiKeySchema(data.provider as Provider);
      return providerSchema.safeParse(data.apiKey).success;
    },
    {
      message: "Invalid API key format for the specified provider",
      path: ["apiKey"],
    }
  );

// GET - Fetch user's API keys
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKeys = await getUserApiKeys(user.id);
    return NextResponse.json({ data: apiKeys });
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }
}

// POST - Save/update API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = SetApiKeySchema.parse(body);

    const result = await setUserApiKey(user.id, validatedData.provider, validatedData.apiKey);

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("Failed to save API key:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: "Failed to save API key" }, { status: 500 });
  }
}

// DELETE - Clear all API keys
export async function DELETE() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await clearAllUserApiKeys(user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to clear all API keys:", error);
    return NextResponse.json({ error: "Failed to clear all API keys" }, { status: 500 });
  }
}
