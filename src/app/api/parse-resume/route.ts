import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { assertEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";

const requestSchema = z.object({
  resume_text: z.string().min(1),
});

async function getResumeTextFromRequest(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const resumeFile = formData.get("resume");

    if (!(resumeFile instanceof File)) {
      throw new Error("Missing 'resume' PDF file in form data.");
    }

    const fileBuffer = Buffer.from(await resumeFile.arrayBuffer());
    const parser = new PDFParse({ data: fileBuffer });
    const parsedPdf = await parser.getText();
    await parser.destroy();
    const extracted = parsedPdf.text?.trim();

    if (!extracted) {
      throw new Error("Could not extract text from PDF.");
    }

    return extracted;
  }

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);

  if (!parsed.success) {
    throw new Error("Invalid request: expected resume_text or multipart resume file.");
  }

  return parsed.data.resume_text;
}

type StarStory = {
  id: string;
  title: string;
  question: string;
  situation: string;
  task: string;
  action: string;
  result: string;
};

function extractTextContent(payload: unknown): string {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const maybeContent = (payload as { content?: Array<{ type?: string; text?: string }> }).content;
  if (!Array.isArray(maybeContent)) {
    return "";
  }

  return maybeContent
    .filter((item) => item.type === "text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n");
}

function parseJsonFromText(text: string): unknown {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }

  throw new Error("Model did not return JSON");
}

export async function POST(request: Request) {
  try {
    assertEnv(["ANTHROPIC_API_KEY"]);
    const resumeText = await getResumeTextFromRequest(request);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const anthropicVersion =
      process.env.ANTHROPIC_API_VERSION || DEFAULT_ANTHROPIC_VERSION;
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const modelResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 3000,
        messages: [
          {
            role: "user",
            content: `Extract this resume into normalized plain text and generate STAR stories.
Return ONLY valid JSON in the shape:
{
  "resume_text": "...",
  "star_stories": [
    {
      "id": "uuid",
      "title": "...",
      "question": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "..."
    }
  ]
}
Prefer 6-8 high quality STAR stories mapped to common behavioral interview prompts.

Resume text:
${resumeText}`,
          },
        ],
      }),
    });

    if (!modelResponse.ok) {
      const failureText = await modelResponse.text();
      return Response.json(
        { error: "Anthropic request failed", details: failureText },
        { status: 500 },
      );
    }

    const payload = await modelResponse.json();
    const rawText = extractTextContent(payload);
    const parsedJson = parseJsonFromText(rawText) as {
      resume_text?: string;
      star_stories?: StarStory[];
    };

    const starStories = (parsedJson.star_stories || []).map((story) => ({
      id: story.id || crypto.randomUUID(),
      title: story.title || "",
      question: story.question || "",
      situation: story.situation || "",
      task: story.task || "",
      action: story.action || "",
      result: story.result || "",
    }));

    return Response.json({
      resume_text: parsedJson.resume_text || resumeText,
      star_stories: starStories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
