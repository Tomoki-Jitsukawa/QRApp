/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      'upload.wikimedia.org',  // Wikipediaの画像
      'jp.mercari.com',        // メルカリの画像
      'example.com',           // 例として追加（必要に応じて削除可能）
      'paypay.ne.jp',          // PayPayの画像
      'pay.line.me',           // LINE Payの画像
      'pay.rakuten.co.jp',     // 楽天ペイの画像
      'd-card.dcard.co.jp',    // d払いの画像
      'aupay.wallet.auone.jp', // au PAYの画像
    ],
    // 代替オプション：remotePatterns を使用してより詳細な制御も可能
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
        pathname: '/wikipedia/commons/**',
      },
      {
        protocol: 'https',
        hostname: 'jp.mercari.com',
        pathname: '/assets/img/**',
      },
    ],
    // SVGファイルを許可
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // その他の設定
  reactStrictMode: true,
};

module.exports = nextConfig; 