import ZAI from 'z-ai-web-dev-sdk';
import type { FrameAnalysis } from './types';

// Singleton ZAI instance — created once, reused across requests
let zaiInstance: InstanceType<typeof ZAI> | null = null;
let zaiInitPromise: Promise<InstanceType<typeof ZAI>> | null = null;

async function getZAI(): Promise<InstanceType<typeof ZAI>> {
  if (zaiInstance) return zaiInstance;
  if (zaiInitPromise) return zaiInitPromise;

  zaiInitPromise = ZAI.create().then((instance) => {
    zaiInstance = instance;
    return instance;
  });

  return zaiInitPromise;
}

/**
 * Extract base64 data from a frame string.
 * Handles both raw base64 and data URI format (data:image/jpeg;base64,...).
 */
function extractBase64(frame: string): string {
  if (frame.startsWith('data:')) {
    // Return the full data URI — VLM can handle data URIs
    return frame;
  }
  // Raw base64 — wrap as data URI for VLM
  return `data:image/jpeg;base64,${frame}`;
}

/**
 * Moderation prompt that instructs VLM to analyze frames for policy violations.
 */
const MODERATION_PROMPT = `You are a content moderation AI for a video chat platform. Analyze the provided video frame and respond ONLY with a valid JSON object — no other text, no markdown fences, no explanation.

Analyze the image for:
1. Human face presence and count (how many distinct faces are visible)
2. Inappropriate or NSFW content (nudity, sexual content, explicit material)
3. Bot/static indicators (screen recordings, pre-recorded loops, static images, unnatural stillness)
4. Any visible policy violations (weapons, illegal activities, harassment gestures)

Respond with exactly this JSON structure:
{
  "face_count": <number of faces detected, 0 or more>,
  "human_present": <true if at least one real human face is clearly visible>,
  "nsfw_score": <float 0.0-1.0 where 0.0 = completely safe and 1.0 = explicit NSFW content>,
  "bot_score": <float 0.0-1.0 where 0.0 = clearly a live human and 1.0 = likely a bot/recorded content>
}

Be conservative with nsfw_score — only assign high values for clearly inappropriate content. A low-resolution webcam frame should typically score near 0.0 for nsfw_score unless explicit content is visible.`;

/**
 * Parse VLM text response into structured FrameAnalysis.
 * Handles various response formats (JSON in code fences, extra text, etc.)
 */
function parseVLMResponse(text: string): FrameAnalysis {
  try {
    // Try to extract JSON from the response
    let jsonStr = text.trim();

    // Remove markdown code fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    // Find JSON object in the response
    const jsonStart = jsonStr.indexOf('{');
    const jsonEnd = jsonStr.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and clamp values
    const face_count = typeof parsed.face_count === 'number'
      ? Math.max(0, Math.round(parsed.face_count))
      : 0;

    const human_present = typeof parsed.human_present === 'boolean'
      ? parsed.human_present
      : face_count > 0;

    const nsfw_score = typeof parsed.nsfw_score === 'number'
      ? Math.max(0, Math.min(1, parsed.nsfw_score))
      : 0;

    const bot_score = typeof parsed.bot_score === 'number'
      ? Math.max(0, Math.min(1, parsed.bot_score))
      : 0;

    return { face_count, human_present, nsfw_score, bot_score };
  } catch {
    // If parsing fails, return a neutral safe default
    console.error('[Moderation] Failed to parse VLM response:', text.substring(0, 200));
    return SAFE_DEFAULT;
  }
}

/**
 * Neutral safe default when VLM fails or times out.
 * Returns scores that produce ZERO composite risk so that service
 * failures never penalize the user with false positives.
 */
const SAFE_DEFAULT: FrameAnalysis = {
  face_count: 0,
  human_present: true,
  nsfw_score: 0,
  bot_score: 0,
};

const VLM_TIMEOUT_MS = 8000; // 8 second timeout for VLM calls

/**
 * Analyze a single video frame using VLM.
 * @param base64Frame - Base64-encoded JPEG (with or without data URI prefix)
 * @returns Structured FrameAnalysis with moderation signals
 */
export async function analyzeFrame(base64Frame: string): Promise<FrameAnalysis> {
  const imageUrl = extractBase64(base64Frame);

  try {
    const zai = await getZAI();

    // Race the VLM call against a timeout
    const result = await Promise.race([
      zai.chat.completions.createVision({
        model: 'glm-4v-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: MODERATION_PROMPT,
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('VLM timeout')), VLM_TIMEOUT_MS)
      ),
    ]);

    const content = result?.choices?.[0]?.message?.content;
    if (!content || typeof content !== 'string') {
      console.error('[Moderation] Empty or invalid VLM response');
      return SAFE_DEFAULT;
    }

    return parseVLMResponse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Moderation] VLM analysis failed:', message);
    return SAFE_DEFAULT;
  }
}
