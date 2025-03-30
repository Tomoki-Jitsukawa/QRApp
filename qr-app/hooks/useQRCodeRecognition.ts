'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';

export type RecognitionResult = {
  services: string[];
};

export type RecognitionError = {
  message: string;
};

export function useQRCodeRecognition() {
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [recognizedServices, setRecognizedServices] = useState<string[]>([]);
  const [recognitionError, setRecognitionError] = useState<RecognitionError | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // オプション: 処理された画像を追跡

  // API呼び出し時の古いクロージャを避けるため、最新のコールバック関数を保持するために ref を使用
  const onResultRef = useRef<((result: RecognitionResult) => void) | null>(null);
  const onErrorRef = useRef<((error: RecognitionError) => void) | null>(null);

  // フックの状態を更新する内部ハンドラ
  const handleSuccess = useCallback((result: RecognitionResult) => {
    console.log('[Hook] API success, result:', result);
    setRecognizedServices(result.services || []);
    setRecognitionError(null);
    setIsRecognizing(false);
    if (result.services?.length > 0) {
        toast.success(`${result.services.join(', ')} が見つかりました。`);
    } else {
        // console.log('No services identified by API.');
        toast.info('QRコードから決済サービスを特定できませんでした。');
    }
    // 外部コールバックが提供されていれば呼び出す
    onResultRef.current?.(result);
  }, []);

  const handleError = useCallback((error: RecognitionError) => {
    console.error('Recognition error:', error.message);
    setRecognizedServices([]);
    setRecognitionError(error);
    setIsRecognizing(false);
    toast.error(`認識エラー: ${error.message}`);
    // 外部コールバックが提供されていれば呼び出す
    onErrorRef.current?.(error);
  }, []);

  // 認識プロセスを開始するためにコンポーネントから呼び出される関数
  const startRecognition = useCallback(async (imageDataUrl: string) => {
    console.log('[Hook] startRecognition called. Resetting states...');
    setCapturedImage(imageDataUrl); // キャプチャした画像データのURLを保存
    setRecognizedServices([]);
    setRecognitionError(null);
    setIsRecognizing(true);

    try {
      const response = await fetch('/api/recognize-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageDataUrl }),
      });

      if (!response.ok) {
        let errorMsg = `API Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          // レスポンスがJSONでない場合は無視
        }
        throw new Error(errorMsg);
      }

      const result: RecognitionResult = await response.json();
      // console.log('API response received:', result);
      handleSuccess(result);

    } catch (error) {
      // console.error('Failed to call recognition API:', error);
      handleError({ message: error instanceof Error ? error.message : 'Unknown error occurred during recognition.' });
    }
  }, [handleSuccess, handleError]); // 内部ハンドラへの依存関係

  // 利用側コンポーネントがコールバックを提供できるようにする
  const setResultCallback = useCallback((callback: (result: RecognitionResult) => void) => {
    onResultRef.current = callback;
  }, []);

  const setErrorCallback = useCallback((callback: (error: RecognitionError) => void) => {
    onErrorRef.current = callback;
  }, []);


  return {
    isRecognizing,
    recognizedServices,
    recognitionError,
    startRecognition,
    capturedImage, // オプションでキャプチャした画像を返す
    // 外部コールバックを設定する関数（オプション、パターンの好みに応じて）
    setResultCallback,
    setErrorCallback,
  };
} 