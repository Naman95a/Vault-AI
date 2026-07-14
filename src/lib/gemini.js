import { GoogleGenAI } from '@google/genai';

/**
 * Get Gemini AI client instance
 * Returns null if no API key is configured
 */
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/**
 * Analyze vault security using Gemini AI
 * IMPORTANT: We never send actual passwords — only metadata
 * @param {object} vaultMetadata - Aggregated metadata about the vault
 * @returns {Promise<object>} AI security analysis
 */
export async function analyzeVaultSecurity(vaultMetadata) {
  const ai = getGeminiClient();

  if (!ai) {
    return getFallbackAnalysis(vaultMetadata);
  }

  try {
    const prompt = `You are a cybersecurity expert analyzing a password vault's security. 
Based on the following metadata (NO actual passwords are shared), provide a comprehensive security audit.

Vault Metadata:
- Total credentials: ${vaultMetadata.totalCredentials}
- Password length distribution: ${JSON.stringify(vaultMetadata.lengthDistribution)}
- Character diversity scores: ${JSON.stringify(vaultMetadata.diversityScores)}
- Average password strength score: ${vaultMetadata.avgStrengthScore}
- Passwords older than 90 days: ${vaultMetadata.oldPasswords}
- Potential duplicate strength patterns: ${vaultMetadata.duplicatePatterns}
- Categories used: ${JSON.stringify(vaultMetadata.categories)}

Respond ONLY with a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "overallScore": <number 0-100>,
  "grade": "<A/B/C/D/F>",
  "summary": "<2-3 sentence summary>",
  "risks": [
    {"level": "high|medium|low", "title": "<risk title>", "description": "<description>", "action": "<recommended action>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const text = response.text.trim();
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini API error:', error);
    return getFallbackAnalysis(vaultMetadata);
  }
}

/**
 * AI-powered password suggestion based on context
 */
export async function getPasswordSuggestion(context) {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      suggestion: 'Use a mix of uppercase, lowercase, numbers, and symbols. Aim for 16+ characters.',
      tips: [
        'Use a passphrase: combine 4-5 random words',
        'Add numbers and symbols between words',
        'Avoid personal information',
        'Make it at least 16 characters',
      ],
    };
  }

  try {
    const prompt = `You are a cybersecurity expert. A user wants to create a password for: "${context}".
    
Give practical, specific advice for creating a strong password for this type of account.
Do NOT generate an actual password.

Respond ONLY with a valid JSON object (no markdown, no code blocks):
{
  "suggestion": "<main advice in 1-2 sentences>",
  "tips": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>"],
  "minRecommendedLength": <number>,
  "importance": "critical|high|medium|low"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
    });

    const text = response.text.trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error('Gemini suggestion error:', error);
    return {
      suggestion: 'Use a strong, unique password with mixed character types.',
      tips: ['Use 16+ characters', 'Mix uppercase, lowercase, numbers, symbols', 'Avoid dictionary words', 'Never reuse passwords'],
    };
  }
}

/**
 * AI chat for security questions
 */
export async function chatWithAI(message, chatHistory = []) {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      response: "AI features require a Gemini API key. Please add your GEMINI_API_KEY to the .env file. You can get a free key from aistudio.google.com.",
      isAIResponse: false,
    };
  }

  try {
    const systemPrompt = `You are VaultAI's security assistant. You ONLY answer questions about:
- Password security best practices
- Account security
- Two-factor authentication
- Phishing protection
- Data breach responses
- General cybersecurity hygiene

Keep responses concise (2-4 sentences). Be helpful and practical.
If asked about unrelated topics, politely redirect to security topics.

IMPORTANT INSTRUCTION FOR ADDING PASSWORDS:
If the user asks you to create, generate, or add a password for a specific website, app, or service (e.g., "add a password for Netflix" or "create a password for abc website"):
1. You MUST include the following JSON block at the very end of your response:
\`\`\`json
{"action": "ADD_CREDENTIAL", "name": "<website_name>", "reply": "I've instructed your vault to securely generate and store a password for <website_name>."}
\`\`\`
2. DO NOT include any warnings, preachy text, or explanations about how you cannot store passwords or generate them. Just return the JSON block and nothing else. Your frontend client will securely generate a cryptographically strong password, encrypt it locally, and save it to the vault.`;

    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'I understand. I\'m VaultAI\'s security assistant, ready to help with password security and cybersecurity questions.' }] },
      ...chatHistory.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      { role: 'user', parts: [{ text: message }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: contents,
    });

    return {
      response: response.text,
      isAIResponse: true,
    };
  } catch (error) {
    console.error('Gemini chat error:', error);
    return {
      response: 'Sorry, I encountered an error. Please try again.',
      isAIResponse: false,
    };
  }
}

/**
 * Fallback analysis when Gemini API is not available
 */
function getFallbackAnalysis(metadata) {
  const { totalCredentials, avgStrengthScore, oldPasswords, duplicatePatterns } = metadata;

  let score = 50;
  const risks = [];
  const strengths = [];
  const recommendations = [];

  if (avgStrengthScore >= 70) {
    score += 15;
    strengths.push('Good average password strength');
  } else if (avgStrengthScore < 50) {
    score -= 15;
    risks.push({ level: 'high', title: 'Weak Passwords', description: 'Many passwords have low strength scores', action: 'Update weak passwords with stronger alternatives' });
  }

  if (oldPasswords > 0) {
    score -= 10;
    risks.push({ level: 'medium', title: 'Aging Passwords', description: `${oldPasswords} passwords haven't been updated in 90+ days`, action: 'Rotate passwords that are older than 90 days' });
  }

  if (duplicatePatterns > 0) {
    score -= 15;
    risks.push({ level: 'high', title: 'Potential Reuse', description: 'Some passwords may share similar patterns', action: 'Ensure each account has a unique password' });
  }

  if (totalCredentials > 0 && risks.length === 0) {
    strengths.push('No critical issues detected');
  }

  score = Math.max(0, Math.min(100, score));
  const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

  recommendations.push('Enable two-factor authentication on all critical accounts');
  recommendations.push('Use unique passwords for every account');
  recommendations.push('Update passwords every 90 days');

  return {
    overallScore: score,
    grade,
    summary: `Your vault has ${totalCredentials} credentials with an average strength score of ${avgStrengthScore}. ${risks.length > 0 ? 'Some areas need attention.' : 'Overall security looks good.'}`,
    risks,
    strengths,
    recommendations,
    isFallback: true,
  };
}
