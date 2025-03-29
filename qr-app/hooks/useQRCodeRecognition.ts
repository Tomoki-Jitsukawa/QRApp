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
  const [capturedImage, setCapturedImage] = useState<string | null>(null); // Optional: keep track of the image that was processed

  // Use refs to hold the latest callback functions to avoid stale closures in API calls
  const onResultRef = useRef<((result: RecognitionResult) => void) | null>(null);
  const onErrorRef = useRef<((error: RecognitionError) => void) | null>(null);

  // Internal handlers that update the hook's state
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
    // Call the external callback if provided
    onResultRef.current?.(result);
  }, []);

  const handleError = useCallback((error: RecognitionError) => {
    console.error('Recognition error:', error.message);
    setRecognizedServices([]);
    setRecognitionError(error);
    setIsRecognizing(false);
    toast.error(`認識エラー: ${error.message}`);
    // Call the external callback if provided
    onErrorRef.current?.(error);
  }, []);

  // The function to be called by the component to start the recognition process
  const startRecognition = useCallback(async (imageDataUrl: string) => {
    console.log('[Hook] startRecognition called. Resetting states...');
    setCapturedImage(imageDataUrl); // Store the captured image data URL
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
          // Ignore if response is not JSON
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
  }, [handleSuccess, handleError]); // Dependencies on internal handlers

  // Allow the consuming component to provide callbacks
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
    capturedImage, // Optionally return the captured image
    // Functions to set external callbacks (optional, depending on pattern preference)
    setResultCallback,
    setErrorCallback,
  };
} 