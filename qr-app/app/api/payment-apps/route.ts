import { NextResponse } from 'next/server';
import { PaymentApp } from '../../types';

// サンプルデータ：主要なQR決済アプリの情報
// 実際のアプリケーションではデータベースから取得する
const paymentApps: PaymentApp[] = [
  {
    id: '1',
    name: 'PayPay',
    logo_url: '/images/paypay_logo.png',
    web_url: 'https://paypay.ne.jp/',
    ios_url_scheme: 'paypay://',
    android_url_scheme: 'paypay://',
    app_store_url: 'https://apps.apple.com/jp/app/paypay-qr/id1435783608',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.ne.paypay.android.app',
    api_available: false
  },
  {
    id: '2',
    name: 'LINE Pay',
    logo_url: '/images/line_pay_logo.png',
    web_url: 'https://pay.line.me/',
    ios_url_scheme: 'line://',
    android_url_scheme: 'line://',
    app_store_url: 'https://apps.apple.com/jp/app/line/id443904275',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.naver.line.android',
    api_available: false
  },
  {
    id: '3',
    name: '楽天ペイ',
    logo_url: '/images/rakuten_pay_logo.png',
    web_url: 'https://pay.rakuten.co.jp/',
    ios_url_scheme: 'rakutenpay://',
    android_url_scheme: 'rakutenpay://',
    app_store_url: 'https://apps.apple.com/jp/app/rakuten-pay/id1139755229',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.rakuten.pay',
    api_available: false
  },
  {
    id: '4',
    name: 'd払い',
    logo_url: '/images/d_barai_logo.png',
    web_url: 'https://d-card.dcard.co.jp/dcard/use/d-barai/',
    ios_url_scheme: 'dpay://',
    android_url_scheme: 'dpay://',
    app_store_url: 'https://apps.apple.com/jp/app/d払い/id1328132872',
    play_store_url: 'https://play.google.com/store/apps/details?id=com.nttdocomo.dcard.application.dpayment',
    api_available: false
  },
  {
    id: '5',
    name: 'au PAY',
    logo_url: '/images/au_pay_logo.png',
    web_url: 'https://aupay.wallet.auone.jp/',
    ios_url_scheme: 'aupay://',
    android_url_scheme: 'aupay://',
    app_store_url: 'https://apps.apple.com/jp/app/au-pay/id1118111228',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.auone.wallet',
    api_available: false
  },
  {
    id: '6',
    name: 'メルペイ',
    logo_url: '/images/merpay_logo.png',
    web_url: 'https://jp.mercari.com/merpay',
    ios_url_scheme: 'mercari://',
    android_url_scheme: 'mercari://',
    app_store_url: 'https://apps.apple.com/jp/app/mercari/id667861049',
    play_store_url: 'https://play.google.com/store/apps/details?id=com.kouzoh.mercari',
    api_available: false
  }
];

export async function GET() {
  return NextResponse.json(paymentApps);
}

// POSTリクエスト対応（実際のアプリケーションでは認証・権限チェックを実装）
export async function POST(request: Request) {
  try {
    const newApp = await request.json();
    
    // Validation - 実際の実装では厳密な検証を行う
    if (!newApp.name || !newApp.web_url) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }
    
    // 実際のアプリではDBに保存し、生成されたIDを返す
    const mockNewApp = {
      ...newApp,
      id: (paymentApps.length + 1).toString(),
      api_available: newApp.api_available || false,
      created_at: new Date().toISOString()
    };
    
    return NextResponse.json(mockNewApp, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "不正なリクエストです" },
      { status: 400 }
    );
  }
} 