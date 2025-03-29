'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button'; // shadcn/ui の Button を使用
import { Camera, RotateCcw, Loader2 } from 'lucide-react'; // アイコン

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void; // 撮影した画像データを親に渡す
  onResult: (services: string[]) => void; // APIからの結果を親に渡す
  onError: (message: string) => void; // エラーメッセージを親に渡す
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onResult, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment'); // 初期は背面カメラ

  // カメラの初期化
  const initializeCamera = useCallback(async (mode: 'user' | 'environment') => {
    try {
      // 既存のストリームがあれば停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 }, // 適宜解像度調整
          height: { ideal: 720 }
        },
        audio: false,
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      onError('カメラへのアクセスに失敗しました。許可設定を確認してください。');
      setStream(null); // エラー時はストリームをクリア
    }
  }, [stream, onError]); // stream と onError を依存関係に追加

  // コンポーネントマウント時とfacingMode変更時にカメラを初期化
  useEffect(() => {
    initializeCamera(facingMode);
    // クリーンアップ関数
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]); // initializeCamera は依存から外す（内部で stream を参照するため無限ループになりうる）

  // カメラ切り替え
  const handleSwitchCamera = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  // 写真撮影とAPI送信
  const handleCapture = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !stream) return;

    setIsProcessing(true);
    onError(''); // エラーメッセージをリセット
    onResult([]); // 結果をリセット

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) {
      onError('キャンバスコンテキストの取得に失敗しました。');
      setIsProcessing(false);
      return;
    }

    // ビデオの解像度に合わせてキャンバスサイズを設定
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // キャンバスに現在のビデオフレームを描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // キャンバスの内容をJPEG形式のData URLとして取得
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9); // 品質を0.9に設定

    onCapture(imageDataUrl); // 撮影した画像を親コンポーネントに渡す

    try {
      const response = await fetch('/api/image-recognition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API Error: ${response.status}`);
      }

      const result = await response.json();
      onResult(result.identifiedServices || []); // 結果を親コンポーネントに渡す

    } catch (error) {
      console.error('Error calling image recognition API:', error);
      let message = '画像認識中にエラーが発生しました。';
      if (error instanceof Error) {
          message = error.message;
      }
      onError(message);
    } finally {
      setIsProcessing(false);
    }
  }, [stream, onCapture, onResult, onError]);

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full max-w-md border rounded-md overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline // iOSでのインライン再生に必要
          muted // 音声は不要
          className="w-full h-auto"
          style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'scaleX(1)' }} // 前面カメラの場合は反転
        />
        {/* 撮影中のローディング表示 */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <Loader2 className="h-12 w-12 text-white animate-spin" />
          </div>
        )}
        {/* カメラが利用できない場合 */}
        {!stream && !isProcessing && (
           <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-center p-4">
             <p className="text-gray-600">カメラを初期化中または利用できません。</p>
           </div>
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} /> {/* 描画用、非表示 */}

      <div className="flex space-x-4">
        <Button onClick={handleCapture} disabled={!stream || isProcessing} size="lg">
          <Camera className="mr-2 h-5 w-5" />
          {isProcessing ? '認識中...' : '撮影して認識'}
        </Button>
        <Button onClick={handleSwitchCamera} disabled={isProcessing} variant="outline" size="icon" title="カメラ切替">
            <RotateCcw className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default CameraCapture; 