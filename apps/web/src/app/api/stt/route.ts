import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { transcribe } from "orate";
import { Groq } from "orate/groq";
import { createErrorResponse } from "../chat/utils/errors";

export async function POST(request: Request) {
  try {
    // Check authentication first
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createErrorResponse("User not authenticated", 401, "AUTH_ERROR");
    }

    // Get the form data with the audio file
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("Processing audio file:", {
      type: audioFile.type,
      size: audioFile.size,
      name: audioFile.name || "unnamed",
      userId: user.id,
    });

    try {
      // Transcribe using Groq STT via orate
      const text = await transcribe({
        model: new Groq().stt("whisper-large-v3-turbo"),
        audio: audioFile,
      });

      console.log("Transcribed text:", text);
      return NextResponse.json({ text });
    } catch (error) {
      console.error("Speech-to-text API error:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { error: "Failed to transcribe audio", details: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Server error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Internal server error", details: errorMessage },
      { status: 500 }
    );
  }
}
