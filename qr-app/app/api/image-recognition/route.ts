import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error('GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-pro-exp-03-25', // または gemini-pro-vision など、用途に応じて
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

    const prompt = `# 指示\n画像からQR決済サービスの公式ロゴを正確に特定し、該当するサービス名をリストアップしてください。\n\n# 対象となる決済サービスリスト (以下のリストにある名前のみを出力対象とします)\n- PayPay\n- LINE Pay\n- 楽天ペイ\n- メルペイ\n- d払い\n- au PAY\n# (必要に応じて他のサポート対象サービスを追加・削除してください)\n\n# 出力ルール\n1.  特定できたサービス名を、上記の「対象となる決済サービスリスト」に記載されている**正確な名称**で、カンマ区切り（\`,\`）で返してください。\n    *   例: \`PayPay,楽天ペイ,d払い\`\n2.  リストに記載されていないサービス名、ロゴ以外の図形や文字、背景などは**完全に無視**してください。\n3.  同じサービスが複数写っていても、出力に含めるのは**1回のみ**（重複させない）。\n4.  対象となるロゴが一つも見つからない場合は、**空の文字列(\"\")** を返してください。\n\n# 特に重要な注意点\n*   **ロゴのデザイン重視:** 画像内のテキスト断片を読むだけでなく、サービスの**公式ロゴのデザイン**と視覚的に一致するかを最優先で判断してください。\n*   **楽天ペイとメルペイの特定:**\n    *   ロゴの文字部分が「R Pay」や「r pay」のように見えても、それが楽天ペイのロゴデザインと一致する場合は、必ず「**楽天ペイ**」としてください。\n    *   ロゴの文字部分が「m Pay」や「mercari」のように見えても、それがメルペイのロゴデザインと一致する場合は、必ず「**メルペイ**」としてください。\n*   **PayPay の慎重な識別:**\n    *   「Pay」という文字を含むロゴは多いですが、**PayPay固有のロゴデザイン**と完全に一致する場合のみ「PayPay」と識別してください。他のロゴと混同しないように、特に注意深く判断してください。\n`;

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