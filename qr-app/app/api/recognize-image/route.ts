import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  console.error("Error: GEMINI_API_KEY environment variable is not set.");
  // Consider throwing an error or returning a specific response in production
}

const genAI = new GoogleGenerativeAI(API_KEY || "YOUR_API_KEY_MISSING"); // Fallback only for type checking, will fail if key is truly missing

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
});

const generationConfig = {
  temperature: 0.4,
  topK: 32,
  topP: 1,
  maxOutputTokens: 4096,
};

// Safety settings to block harmful content
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

// Helper function to convert Data URL to Generative Part
function fileToGenerativePart(dataUrl: string): { inlineData: { data: string; mimeType: string } } | null {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.*)$/);
  if (!match) {
    console.error("Invalid image data URL format");
    return null;
  }
  const mimeType = match[1];
  const base64Data = match[2];
  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType,
    },
  };
}

export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ error: "API key is not configured." }, { status: 500 });
  }

  try {
    const { imageDataUrl } = await request.json();

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json({ error: "Missing or invalid imageDataUrl" }, { status: 400 });
    }

    const imagePart = fileToGenerativePart(imageDataUrl);

    if (!imagePart) {
        return NextResponse.json({ error: "Invalid image data format" }, { status: 400 });
    }

    const prompt = `
      この画像に写っているQRコード決済サービスのロゴを特定し、その正式名称のリストだけをJSON配列形式で返してください。
      例: ["PayPay", "楽天ペイ", "d払い"]
      ロゴが見つからない場合や、QRコード決済サービス以外のロゴの場合は、空の配列 [] を返してください。
      余計な説明や前置きは不要です。JSON配列のみを返してください。
      認識可能なサービス例: PayPay, LINE Pay, 楽天ペイ, d払い, au PAY, メルペイ
    `;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const text = response.text();

    console.log("Gemini API Raw Response Text:", text); // Log raw response for debugging

    try {
      // Attempt to parse the text as JSON
      const serviceNames = JSON.parse(text);
      if (!Array.isArray(serviceNames) || !serviceNames.every(item => typeof item === 'string')) {
         console.error("Gemini response is not a valid JSON array of strings:", text);
         // Fallback: Try to extract names if possible, or return empty
         // This simple fallback assumes names might be comma-separated or similar
         const extracted = text.match(/(PayPay|LINE Pay|楽天ペイ|d払い|au PAY|メルペイ)/g);
         return NextResponse.json({ services: extracted || [] });
      }
      return NextResponse.json({ services: serviceNames });
    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON:", text, parseError);
       // Fallback: Try to extract names if JSON parsing fails
       const extracted = text.match(/(PayPay|LINE Pay|楽天ペイ|d払い|au PAY|メルペイ)/g);
      return NextResponse.json({ services: extracted || [] });
    }

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    // Provide a more generic error message to the client
    return NextResponse.json({ error: "Failed to process image recognition." }, { status: 500 });
  }
} 