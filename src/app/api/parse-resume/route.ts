import { z } from "zod";
import { assertEnv } from "@/lib/runtime-env";

export const runtime = "nodejs";

const DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_ANTHROPIC_VERSION = "2023-06-01";
const PARSE_RESUME_TIMEOUT_MS = 45000;
const MAX_RESUME_CHARS = 30000;
const STAR_QUESTION_BANK = [
  "Tell me about a time you led a complex project end-to-end.",
  "Tell me about a time you resolved a high-impact production issue.",
  "Tell me about a time you improved model performance significantly.",
  "Tell me about a time you had to make a difficult technical tradeoff.",
  "Tell me about a time your experiment failed and what you learned.",
  "Tell me about a time you influenced stakeholders without direct authority.",
  "Tell me about a time you improved system efficiency (latency, cost, or memory).",
  "Tell me about a time you mentored or raised the bar for a team.",
] as const;

const requestSchema = z.object({
  resume_text: z.string().min(1),
});

type PdfParseResult = { text?: string };
type PdfParseFn = (dataBuffer: Buffer) => Promise<PdfParseResult>;

let cachedPdfParse: PdfParseFn | null = null;

async function getPdfParse(): Promise<PdfParseFn> {
  if (cachedPdfParse) {
    return cachedPdfParse;
  }

  const module = (await import("pdf-parse/lib/pdf-parse.js")) as {
    default?: PdfParseFn;
  };

  const parser = module.default;
  if (typeof parser !== "function") {
    throw new Error("PDF parser is unavailable in runtime.");
  }

  cachedPdfParse = parser;
  return parser;
}

async function getResumeTextFromRequest(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const resumeFile = formData.get("resume");

    if (!(resumeFile instanceof File)) {
      throw new Error("Missing 'resume' PDF file in form data.");
    }

    const fileBuffer = Buffer.from(await resumeFile.arrayBuffer());
    const pdfParse = await getPdfParse();
    const parsedPdf = await pdfParse(fileBuffer);
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

const starStorySchema = z.object({
  id: z.string().optional(),
  title: z.string().default(""),
  question: z.string().default(""),
  situation: z.string().default(""),
  task: z.string().default(""),
  action: z.string().default(""),
  result: z.string().default(""),
});

const starStoriesSchema = z.object({
  star_stories: z.array(starStorySchema).default([]),
});

const fallbackStoriesSchema = z.object({
  star_stories: z.array(starStorySchema).min(1),
});

type AnthropicToolUseBlock = {
  type?: string;
  name?: string;
  input?: unknown;
};

function trimResumeForPrompt(resumeText: string): string {
  if (resumeText.length <= MAX_RESUME_CHARS) {
    return resumeText;
  }

  return `${resumeText.slice(0, MAX_RESUME_CHARS)}\n\n[TRUNCATED_FOR_MODEL_INPUT]`;
}

function formatQuestionBank(): string {
  return STAR_QUESTION_BANK.map((question, index) => `${index + 1}. ${question}`).join("\n");
}

function extractToolInputByName(payload: unknown, toolName: string): unknown {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const maybeContent = (payload as { content?: AnthropicToolUseBlock[] }).content;
  if (!Array.isArray(maybeContent)) {
    return null;
  }

  const toolUse = maybeContent.find(
    (item) => item?.type === "tool_use" && item?.name === toolName,
  );

  return toolUse?.input ?? null;
}

async function generateFallbackStories(
  apiKey: string,
  anthropicModel: string,
  anthropicVersion: string,
  resumeText: string,
): Promise<StarStory[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PARSE_RESUME_TIMEOUT_MS);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 1200,
        temperature: 0,
        tools: [
          {
            name: "extract_star_stories",
            description: "Generate STAR stories from a resume text.",
            input_schema: {
              type: "object",
              properties: {
                star_stories: {
                  type: "array",
                  minItems: 4,
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      question: { type: "string", enum: [...STAR_QUESTION_BANK] },
                      situation: { type: "string" },
                      task: { type: "string" },
                      action: { type: "string" },
                      result: { type: "string" },
                    },
                    required: ["title", "question", "situation", "task", "action", "result"],
                  },
                },
              },
              required: ["star_stories"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_star_stories" },
        messages: [
          {
            role: "user",
            content: `Generate 6-8 high quality STAR stories for behavioral interviews from this resume text.
Use only the exact question strings from this fixed list, one story per question:
${formatQuestionBank()}

Return output using the selected tool only.

Resume text:
${resumeText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const toolInput = extractToolInputByName(payload, "extract_star_stories");
    if (!toolInput) {
      return [];
    }

    return fallbackStoriesSchema.parse(toolInput).star_stories.map((story) => ({
      id: story.id || crypto.randomUUID(),
      title: story.title || "",
      question: story.question || "",
      situation: story.situation || "",
      task: story.task || "",
      action: story.action || "",
      result: story.result || "",
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(request: Request) {
  try {
    assertEnv(["ANTHROPIC_API_KEY"]);
    const resumeText = await getResumeTextFromRequest(request);
    const promptResumeText = trimResumeForPrompt(resumeText);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel = process.env.ANTHROPIC_MODEL || DEFAULT_ANTHROPIC_MODEL;
    const anthropicVersion =
      process.env.ANTHROPIC_API_VERSION || DEFAULT_ANTHROPIC_VERSION;
    if (!apiKey) {
      return Response.json({ error: "Missing ANTHROPIC_API_KEY" }, { status: 500 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PARSE_RESUME_TIMEOUT_MS);

    const modelResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": anthropicVersion,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: anthropicModel,
        max_tokens: 4000,
        temperature: 0,
        tools: [
          {
            name: "extract_star_stories",
            description: "Generate STAR stories from a resume for behavioral interview prep.",
            input_schema: {
              type: "object",
              properties: {
                star_stories: {
                  type: "array",
                  minItems: 6,
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      title: { type: "string" },
                      question: { type: "string", enum: [...STAR_QUESTION_BANK] },
                      situation: { type: "string" },
                      task: { type: "string" },
                      action: { type: "string" },
                      result: { type: "string" },
                    },
                    required: ["title", "question", "situation", "task", "action", "result"],
                  },
                },
              },
              required: ["star_stories"],
            },
          },
        ],
        tool_choice: { type: "tool", name: "extract_star_stories" },
        messages: [
          {
            role: "user",
            content: `Generate 6-8 high quality STAR stories for behavioral interviews from this resume.
Use only the exact question strings from this fixed list, one story per question:
${formatQuestionBank()}

Return output using the selected tool only.

Resume text:
${promptResumeText}`,
          },
        ],
      }),
    });

    clearTimeout(timeout);

    if (!modelResponse.ok) {
      const failureText = await modelResponse.text();
      return Response.json(
        { error: "Anthropic request failed", details: failureText },
        { status: 500 },
      );
    }

    const payload = await modelResponse.json();
    const toolInput = extractToolInputByName(payload, "extract_star_stories");

    const parsedJson = toolInput
      ? starStoriesSchema.parse(toolInput)
      : { star_stories: [] };

    let starStories = parsedJson.star_stories.map((story) => ({
      id: story.id || crypto.randomUUID(),
      title: story.title || "",
      question: story.question || "",
      situation: story.situation || "",
      task: story.task || "",
      action: story.action || "",
      result: story.result || "",
    }));

    if (starStories.length === 0) {
      starStories = await generateFallbackStories(
        apiKey,
        anthropicModel,
        anthropicVersion,
        promptResumeText,
      );
    }

    return Response.json({
      resume_text: resumeText,
      star_stories: starStories,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
