import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash', // または gemini-pro-vision など、用途に応じて
});

// 安全性設定 (必要に応じて調整)
const safetySettings = [
    {
        category: HarmCategory.HARM_CATEGORY_HARASSMENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
    {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const imageDataBase64 = body.image; // base64エンコードされた画像データ文字列を期待

    if (!imageDataBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Base64データからMIMEタイプを抽出 (例: "data:image/jpeg;base64,...")
    const mimeTypeMatch = imageDataBase64.match(/^data:(image\/\w+);base64,/);
    if (!mimeTypeMatch) {
        return NextResponse.json({ error: 'Invalid image data format' }, { status: 400 });
    }
    const mimeType = mimeTypeMatch[1];
    const imageData = imageDataBase64.replace(/^data:image\/\w+;base64,/, ""); // Base64部分のみ取得


    const imagePart = {
        inlineData: {
            data: imageData,
            mimeType: mimeType,
        },
    };

    const prompt = `
      この画像に写っているQR決済サービスのロゴを特定し、そのサービス名をリストアップしてください。
      例えば、「PayPay」、「LINE Pay」、「楽天ペイ」、「メルペイ」、「d払い」、「au PAY」などです。
      他のロゴや文字は無視してください。サービス名のみをカンマ区切りで返してください。
      もし何も見つからなければ、空の文字列を返してください。
      例: PayPay,楽天ペイ
    `;

    const result = await model.generateContent({
        contents: [{ role: "user", parts: [imagePart, { text: prompt }] }],
        // generationConfig: generationConfig, // 必要なら追加
        safetySettings: safetySettings,
    });

    const response = result.response;
    const identifiedServicesText = response.text();

    // Geminiからの応答をパースしてサービス名の配列にする (単純なカンマ区切りを想定)
    const identifiedServices = identifiedServicesText.split(',').map(s => s.trim()).filter(s => s.length > 0);


    return NextResponse.json({ identifiedServices });

  } catch (error) {
    console.error('Error processing image with Gemini:', error);
    // エラーの詳細をログに出力しつつ、クライアントには一般的なエラーメッセージを返す
    let errorMessage = 'Failed to process image';
    let statusCode = 500;

    if (error instanceof Error) {
        errorMessage = error.message;
        // Gemini APIからの特定のエラーコードに基づいてステータスコードを調整することも可能
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
} 