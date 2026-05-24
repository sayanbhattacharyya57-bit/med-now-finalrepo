const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../utils/logger");

let genAI = null;
let model = null;

const getModel = () => {
  if (!model) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not configured");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
  return model;
};

const SYSTEM_PROMPT = `You are MedBot, an AI healthcare assistant for MedNow — a platform designed for rural and underserved communities in India. Your role is to:

1. Provide general health information and guidance in simple, easy-to-understand language
2. Help users understand symptoms and when to seek immediate medical care
3. Offer basic first aid guidance
4. Answer questions about medicines, dosages, and side effects
5. Guide users on preventive healthcare
6. Support multiple Indian languages (Hindi, Tamil, Telugu, Bengali) if requested
7. Always recommend consulting a doctor for diagnosis and treatment

IMPORTANT RULES:
- Never diagnose specific medical conditions definitively
- Always emphasize seeking professional medical help for serious symptoms
- For emergencies (chest pain, difficulty breathing, unconsciousness), immediately recommend calling emergency services or using the SOS feature
- Be empathetic, culturally sensitive, and appropriate for rural communities
- Keep responses concise and practical
- Mention free/low-cost options when relevant`;

const chat = async (message, history = [], language = "en") => {
  try {
    const m = getModel();

    const languageInstruction = language !== "en"
      ? `\nNote: The user prefers ${language === "hi" ? "Hindi" : language === "ta" ? "Tamil" : language === "te" ? "Telugu" : "Bengali"} language. Respond in that language if possible.`
      : "";

    const formattedHistory = history.map((h) => ({
      role: h.role,
      parts: [{ text: h.content }],
    }));

    const chatSession = m.startChat({
      history: [
        { role: "user", parts: [{ text: SYSTEM_PROMPT + languageInstruction }] },
        { role: "model", parts: [{ text: "Understood. I am MedBot, your AI healthcare assistant for MedNow. I will provide helpful health information while always recommending professional medical consultation when needed. How can I help you today?" }] },
        ...formattedHistory,
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    const result = await chatSession.sendMessage(message);
    const response = await result.response;
    return response.text();
  } catch (err) {
    logger.error(`Gemini API error: ${err.message}`);
    throw err;
  }
};

const analyzeSymptoms = async (symptoms, patientInfo = {}) => {
  try {
    const m = getModel();
    const prompt = `${SYSTEM_PROMPT}

A patient reports the following symptoms: ${symptoms.join(", ")}
Patient info: Age ${patientInfo.age || "unknown"}, Gender ${patientInfo.gender || "unknown"}, Known conditions: ${patientInfo.conditions?.join(", ") || "none"}

Please provide:
1. Possible causes (listed as possibilities, not diagnoses)
2. Urgency level (Low/Medium/High/Emergency)
3. Recommended immediate actions
4. When to seek immediate medical care
5. Basic home care tips if appropriate

Keep the response structured and easy to understand.`;

    const result = await m.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    logger.error(`Gemini symptom analysis error: ${err.message}`);
    throw err;
  }
};

module.exports = { chat, analyzeSymptoms };
