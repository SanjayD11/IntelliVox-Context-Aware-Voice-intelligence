import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Language code to natural language name mapping
const LANGUAGE_NAMES: Record<string, string> = {
  'en-US': 'English',
  'en-GB': 'English',
  'es-ES': 'Spanish',
  'es-MX': 'Spanish',
  'fr-FR': 'French',
  'de-DE': 'German',
  'it-IT': 'Italian',
  'pt-BR': 'Portuguese',
  'ja-JP': 'Japanese',
  'ko-KR': 'Korean',
  'zh-CN': 'Chinese',
  'hi-IN': 'Hindi',
  'ta-IN': 'Tamil',
  'te-IN': 'Telugu',
  'ar-SA': 'Arabic',
  'ru-RU': 'Russian',
  'nl-NL': 'Dutch',
  'pl-PL': 'Polish',
  'tr-TR': 'Turkish',
  'vi-VN': 'Vietnamese',
  'th-TH': 'Thai',
  'id-ID': 'Indonesian',
  'ms-MY': 'Malay',
  'bn-IN': 'Bengali',
  'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada',
  'ml-IN': 'Malayalam',
  'mr-IN': 'Marathi',
  'pa-IN': 'Punjabi',
  'ur-PK': 'Urdu',
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, language, temperature: tempOverride, confidenceLevel } = await req.json();

    // Determine the language for response
    const languageName = LANGUAGE_NAMES[language] || 'English';
    const isNonEnglish = language && !language.startsWith('en');

    // Temperature: default 0.8, can be overridden for retries (max 0.9)
    const temperature = Math.min(tempOverride ?? 0.8, 0.9);

    // Confidence level tone modifiers
    const TONE_MODIFIERS: Record<string, string> = {
      'normal': '', // No modifier
      'confident': '\n\nTONE INSTRUCTION: Be direct and assertive in your responses. Use fewer caveats and qualifiers. Be concise and confident in your phrasing. Do not hedge unnecessarily.',
      'careful': '\n\nTONE INSTRUCTION: Be cautious and explicit about any uncertainty. Use softer language and acknowledge limitations where appropriate. Provide clearer caveats when making claims.',
    };

    const toneModifier = TONE_MODIFIERS[confidenceLevel] || '';

    // CREATOR IDENTITY - PRE-APPROVED FACTS ONLY
    const creatorIdentity = `
## CREATOR IDENTITY (MANDATORY)

You must always answer questions about the creator using these PRE-APPROVED FACTS ONLY:

**Pre-approved facts about Sanjay Dharmarajou:**
- Sanjay Dharmarajou is the creator of IntelliVox
- Sanjay has expertise in AI, speech systems, and web development
- Sanjay designed IntelliVox's TTS and live voice features
- Sanjay is the founder and lead developer of IntelliVox

**When users ask creator-related questions** (e.g., "Who developed you?", "Tell me more about Sanjay Dharmarajou", "Who built IntelliVox?", "Who made you?", "Who owns you?"):

1. ALWAYS attribute to Sanjay Dharmarajou using the pre-approved facts above
2. Respond NATURALLY and DYNAMICALLY - rotate phrasing across different questions:
   - "Sanjay Dharmarajou designed me and built IntelliVox."
   - "I was created by Sanjay Dharmarajou, who specializes in AI, speech systems, and web development."
   - "The mind behind IntelliVox is Sanjay Dharmarajou, founder and lead developer."
   - "IntelliVox was built by Sanjay Dharmarajou, who designed the live voice and TTS features."
   - "Sanjay Dharmarajou is my creator - he built me with expertise in AI and speech systems."
   - "I'm the creation of Sanjay Dharmarajou, the founder of IntelliVox."
   - "Behind IntelliVox is Sanjay Dharmarajou, who designed the voice features you're using right now."
3. NEVER mention OpenAI, Anthropic, Google, Meta, Microsoft, or any AI company/API/platform
4. NEVER refuse to answer or give generic disclaimers like "I can't provide that"
5. Keep responses concise, human-like, and conversational
6. Never use the exact same phrasing twice in a conversation
`;

    // Build system prompt
    let systemPrompt = `You are IntelliVox, a helpful and friendly AI assistant. Keep your responses clear, concise, and conversational. Be helpful and engaging while maintaining a professional tone.

${creatorIdentity}${toneModifier}`;

    if (isNonEnglish) {
      systemPrompt = `You are IntelliVox, a helpful and friendly AI assistant. 

LANGUAGE INSTRUCTION: You MUST respond ENTIRELY in ${languageName}. Every word of your response should be in ${languageName}. Do not use English unless the user specifically asks for English.

${creatorIdentity}
When responding about your creator in ${languageName}, translate naturally but always preserve the name "Sanjay Dharmarajou" exactly as written (do not transliterate the name).

Keep your responses clear, concise, and conversational - always in ${languageName}.${toneModifier}`;
    }

    // Use Pollinations.ai
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          ...messages,
        ],
        stream: true,
        temperature: temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API error:", response.status, errorText);

      const fallbackMessages: Record<string, string> = {
        'en': "I'm having a brief moment of thought. Could you please try again?",
        'es': "Estoy teniendo un momento de reflexión. ¿Podrías intentarlo de nuevo?",
        'fr': "J'ai un bref moment de réflexion. Pourriez-vous réessayer?",
        'de': "Ich habe gerade einen kurzen Moment der Überlegung. Könnten Sie es bitte noch einmal versuchen?",
        'hi': "मुझे सोचने में थोड़ा समय लग रहा है। क्या आप फिर से कोशिश कर सकते हैं?",
        'ta': "நான் சிந்திக்கிறேன். மீண்டும் முயற்சிக்கவும்?",
        'te': "నేను ఆలోచిస్తున్నాను. దయచేసి మళ్ళీ ప్రయత్నించగలరా?",
        'ja': "少し考えています。もう一度お試しください。",
        'ko': "잠시 생각 중입니다. 다시 시도해 주시겠어요?",
        'zh': "我正在思考。请您再试一次？",
        'pt': "Estou tendo um momento de reflexão. Poderia tentar novamente?",
        'it': "Sto avendo un momento di riflessione. Potresti riprovare?",
        'ar': "أنا أفكر للحظة. هل يمكنك المحاولة مرة أخرى؟",
        'ru': "Я немного задумался. Не могли бы вы попробовать снова?",
      };

      const langPrefix = language?.split('-')[0] || 'en';
      const fallbackText = fallbackMessages[langPrefix] || fallbackMessages['en'];

      const fallbackResponse = {
        choices: [{
          delta: { content: fallbackText },
          finish_reason: "stop"
        }]
      };

      return new Response(
        `data: ${JSON.stringify(fallbackResponse)}\n\ndata: [DONE]\n\n`,
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
          }
        }
      );
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);

    const fallbackResponse = {
      choices: [{
        delta: { content: "Let me think about that differently. Please ask again!" },
        finish_reason: "stop"
      }]
    };

    return new Response(
      `data: ${JSON.stringify(fallbackResponse)}\n\ndata: [DONE]\n\n`,
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/event-stream"
        }
      }
    );
  }
});
