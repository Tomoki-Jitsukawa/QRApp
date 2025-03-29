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
  console.log("Received Data URL (start):", dataUrl.substring(0, 50) + "..."); // Log start of Data URL
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg|jpg|webp));base64,(.*)$/);
  if (!match) {
    console.error("Invalid image data URL format");
    return null;
  }
  const mimeType = match[1];
  const base64Data = match[2];
  console.log("Extracted mimeType:", mimeType); // Log mimeType
  console.log("Extracted base64Data (start):", base64Data.substring(0, 50) + "..."); // Log start of base64 data
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
    console.log("Received request with imageDataUrl (start):", imageDataUrl?.substring(0, 50) + "..."); // Log received URL again

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json({ error: "Missing or invalid imageDataUrl" }, { status: 400 });
    }

    const imagePart = fileToGenerativePart(imageDataUrl);
    console.log("Generated imagePart:", imagePart ? { mimeType: imagePart.inlineData.mimeType, dataStart: imagePart.inlineData.data.substring(0, 50) + "..." } : null); // Log the generated part

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

    console.log("Calling Gemini API with imagePart:", imagePart ? "Exists" : "Null"); // Confirm imagePart before API call
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    const response = result.response;
    const text = response.text();

    console.log("Gemini API Raw Response Text:", text); // Keep this log

    let serviceNames: string[] = [];
    try {
      // Attempt to extract JSON from markdown code block
      const codeBlockRegex = /```json\s*([\s\S]*?)\s*```/;
      const match = text.match(codeBlockRegex);
      let jsonString = text; // Default to original text

      if (match && match[1]) {
        jsonString = match[1].trim(); // Use the content inside the code block
        console.log("Extracted JSON string from markdown:", jsonString);
      } else {
         // If no markdown, try trimming the raw text just in case
         jsonString = text.trim();
         console.log("No markdown detected, using trimmed raw text:", jsonString);
      }

      // Attempt to parse the potentially cleaned JSON string
      const parsed = JSON.parse(jsonString);

      if (!Array.isArray(parsed) || !parsed.every(item => typeof item === 'string')) {
         console.error("Parsed response is not a valid JSON array of strings:", parsed);
         // Fallback: Use the original raw text for regex extraction as a last resort
         const extracted = text.match(/(PayPay|LINE Pay|楽天ペイ|d払い|au PAY|メルペイ)/g);
         serviceNames = extracted || [];
         console.log("Fallback regex extraction result (invalid array):", serviceNames);
      } else {
        serviceNames = parsed; // Successfully parsed
        console.log("Successfully parsed service names:", serviceNames);
      }

    } catch (parseError) {
      console.error("Failed to parse Gemini response as JSON even after cleaning:", text, parseError);
       // Fallback: Use the original raw text for regex extraction
       const extracted = text.match(/(PayPay|LINE Pay|楽天ペイ|d払い|au PAY|メルペイ)/g);
       serviceNames = extracted || [];
       console.log("Fallback regex extraction result (parse error):", serviceNames);
    }

    // Return the final serviceNames array
    return NextResponse.json({ services: serviceNames });

  } catch (error) {
    console.error("!!! Error during image recognition process:", error); // Make error log more prominent
    return NextResponse.json({ error: "Failed to process image recognition." }, { status: 500 });
  }
} 