const { chat, analyzeSymptoms } = require("../services/geminiService");
const { sendSuccess, sendError } = require("../utils/response");
const logger = require("../utils/logger");

const sendMessage = async (req, res, next) => {
  try {
    const { message, history = [], language } = req.body;
    if (!message || !message.trim()) return sendError(res, 400, "Message is required");

    const userLanguage = language || req.user?.language || "en";
    const response = await chat(message.trim(), history, userLanguage);

    return sendSuccess(res, 200, "Response generated", {
      message: response,
      timestamp: new Date(),
    });
  } catch (err) {
    if (err.message?.includes("GEMINI_API_KEY")) {
      return sendError(res, 503, "AI chatbot is not configured. Please add GEMINI_API_KEY.");
    }
    if (err.status === 429 || err.message?.includes("quota")) {
      return sendError(res, 429, "AI service quota exceeded. Please try again later.");
    }
    logger.error(`Chatbot error: ${err.message}`);
    next(err);
  }
};

const analyzeUserSymptoms = async (req, res, next) => {
  try {
    const { symptoms, age, gender, conditions } = req.body;
    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return sendError(res, 400, "At least one symptom is required");
    }

    const patientInfo = {
      age: age || req.user?.patientProfile?.dateOfBirth
        ? Math.floor((new Date() - new Date(req.user.patientProfile.dateOfBirth)) / 31557600000)
        : undefined,
      gender: gender || req.user?.patientProfile?.gender,
      conditions: conditions || req.user?.patientProfile?.chronicConditions,
    };

    const analysis = await analyzeSymptoms(symptoms, patientInfo);

    return sendSuccess(res, 200, "Symptom analysis complete", {
      analysis,
      symptoms,
      disclaimer: "This is an AI-generated preliminary assessment. Please consult a doctor for proper diagnosis.",
      timestamp: new Date(),
    });
  } catch (err) {
    if (err.message?.includes("GEMINI_API_KEY")) {
      return sendError(res, 503, "AI service not configured");
    }
    next(err);
  }
};

const getHealthTip = async (req, res, next) => {
  try {
    const { topic, language } = req.query;
    const userLanguage = language || req.user?.language || "en";
    const topicText = topic || "general health for rural communities";

    const response = await chat(
      `Give me a brief, practical health tip about: ${topicText}. Keep it under 100 words and make it actionable for someone in a rural area.`,
      [],
      userLanguage
    );

    return sendSuccess(res, 200, "Health tip retrieved", {
      tip: response,
      topic: topicText,
      timestamp: new Date(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendMessage, analyzeUserSymptoms, getHealthTip };
