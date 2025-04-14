import { NextResponse } from 'next/server';
import { PointApp } from '../../types';

// サンプルデータ：主要なポイントアプリの情報
const pointApps: PointApp[] = [
  {
    id: '1',
    name: 'Vポイント',
    logo_url: '/images/vpoint_logo.png',
    web_url: 'https://vpoint.jp/',
    ios_url_scheme: 'vpoint://',
    android_url_scheme: 'vpoint://',
    app_store_url: 'https://apps.apple.com/jp/app/vpoint/id939540582',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.vpoint.app',
    api_available: false
  },
  {
    id: '2',
    name: '楽天ポイント',
    logo_url: '/images/rakuten_point_logo.png',
    web_url: 'https://point.rakuten.co.jp/',
    ios_url_scheme: 'rakuten://',
    android_url_scheme: 'rakuten://',
    app_store_url: 'https://apps.apple.com/jp/app/%E6%A5%BD%E5%A4%A9%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%82%AF%E3%83%A9%E3%83%96/id1094107454',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.rakuten.pointclub',
    api_available: false
  },
  {
    id: '3',
    name: 'dポイント',
    logo_url: '/images/dpoint_logo.png',
    web_url: 'https://dpoint.jp/',
    ios_url_scheme: 'dpoint-app://',
    android_url_scheme: 'dpoint://',
    app_store_url: 'https://apps.apple.com/jp/app/d%E3%83%9D%E3%82%A4%E3%83%B3%E3%83%88%E3%82%AF%E3%83%A9%E3%83%96/id1093466147',
    play_store_url: 'https://play.google.com/store/apps/details?id=com.nttdocomo.dpoint',
    api_available: false
  },
  {
    id: '4',
    name: 'Ponta',
    logo_url: '/images/ponta_logo.png',
    web_url: 'https://point.recruit.co.jp/',
    ios_url_scheme: 'pontaweb://',
    android_url_scheme: 'ponta://',
    app_store_url: 'https://apps.apple.com/jp/app/ponta/id533199470',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.co.recruit.pontalink',
    api_available: false
  },
  {
    id: '5',
    name: 'PayPayポイント',
    logo_url: '/images/paypay_point_logo.png',
    web_url: 'https://www.paypay.ne.jp/point/',
    ios_url_scheme: 'paypay://',
    android_url_scheme: 'paypay://',
    app_store_url: 'https://apps.apple.com/jp/app/paypay-qr/id1435783608',
    play_store_url: 'https://play.google.com/store/apps/details?id=jp.ne.paypay.android.app',
    api_available: false
  }
];

export async function GET() {
  return NextResponse.json(pointApps);
}

export async function POST(request: Request) {
  try {
    const newApp = await request.json();
    
    // Validation
    if (!newApp.name || !newApp.web_url) {
      return NextResponse.json(
        { error: "必須項目が不足しています" },
        { status: 400 }
      );
    }
    
    // 実際のアプリではDBに保存
    const mockNewApp = {
      ...newApp,
      id: (pointApps.length + 1).toString(),
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