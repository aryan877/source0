import { serverMarkStreamAsCancelled } from "@/services/chat-streams.server";
import { pub } from "@/utils/redis";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { chatId, streamId } = await req.json();

    if (!chatId || !streamId) {
      return NextResponse.json(
        { error: "chatId and streamId are required" },
        {
          status: 400,
        }
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "User not authenticated" },
        {
          status: 401,
        }
      );
    }

    await serverMarkStreamAsCancelled(supabase, streamId);

    if (pub) {
      await pub.publish(`chat-cancel-${streamId}`, "cancel");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error cancelling stream:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
      }
    );
  }
}
