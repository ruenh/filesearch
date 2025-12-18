/**
 * useVoiceSearch hook - Web Speech API integration for voice search
 * Requirements: 12.1, 12.2, 12.3
 */

import { useState, useCallback, useRef, useEffect } from "react";

// Type definitions for Web Speech API
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror:
    | ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
    | null;
  onresult:
    | ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
    | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseVoiceSearchOptions {
  /** Language for speech recognition (default: 'ru-RU') */
  language?: string;
  /** Whether to show interim results (default: false) */
  interimResults?: boolean;
  /** Callback when speech is recognized */
  onResult?: (transcript: string, isFinal: boolean) => void;
  /** Callback when an error occurs */
  onError?: (error: string) => void;
  /** Callback when listening starts */
  onStart?: () => void;
  /** Callback when listening ends */
  onEnd?: () => void;
  /** Auto-execute search after recognition (default: true) */
  autoExecute?: boolean;
}

export interface UseVoiceSearchReturn {
  /** Whether voice search is supported in the browser */
  isSupported: boolean;
  /** Whether currently listening for speech */
  isListening: boolean;
  /** The current transcript (interim or final) */
  transcript: string;
  /** Any error that occurred */
  error: string | null;
  /** Start listening for speech */
  startListening: () => void;
  /** Stop listening for speech */
  stopListening: () => void;
  /** Reset the transcript and error state */
  reset: () => void;
}

/**
 * Hook for voice search functionality using Web Speech API
 *
 * Requirements:
 * - 12.1: Activate microphone and listen for speech
 * - 12.2: Convert speech to text query
 * - 12.3: Execute search automatically after conversion
 */
export function useVoiceSearch(
  options: UseVoiceSearchOptions = {}
): UseVoiceSearchReturn {
  const {
    language = "ru-RU",
    interimResults = false,
    onResult,
    onError,
    onStart,
    onEnd,
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check if Web Speech API is supported
  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  // Get the SpeechRecognition constructor
  const getSpeechRecognition =
    useCallback((): SpeechRecognitionConstructor | null => {
      if (typeof window === "undefined") return null;
      return window.SpeechRecognition || window.webkitSpeechRecognition || null;
    }, []);

  // Clean up recognition instance
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
    };
  }, []);

  // Start listening for speech (Requirement 12.1)
  const startListening = useCallback(() => {
    if (!isSupported) {
      const errorMsg = "Голосовой поиск не поддерживается в вашем браузере";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }

    const SpeechRecognitionAPI = getSpeechRecognition();
    if (!SpeechRecognitionAPI) {
      const errorMsg = "Не удалось инициализировать голосовой поиск";
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = interimResults;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setTranscript("");
        onStart?.();
      };

      // Handle speech recognition results (Requirement 12.2)
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const result = event.results[event.resultIndex];
        const transcriptText = result[0].transcript;
        const isFinal = result.isFinal;

        setTranscript(transcriptText);

        // Execute callback with transcript (Requirement 12.3)
        if (isFinal || !interimResults) {
          onResult?.(transcriptText, isFinal);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        let errorMsg: string;

        switch (event.error) {
          case "no-speech":
            errorMsg = "Речь не обнаружена. Попробуйте еще раз.";
            break;
          case "audio-capture":
            errorMsg = "Микрофон не найден. Проверьте подключение.";
            break;
          case "not-allowed":
            errorMsg =
              "Доступ к микрофону запрещен. Разрешите доступ в настройках браузера.";
            break;
          case "network":
            errorMsg = "Ошибка сети. Проверьте подключение к интернету.";
            break;
          case "aborted":
            // User aborted, not an error
            errorMsg = "";
            break;
          default:
            errorMsg = `Ошибка распознавания: ${event.error}`;
        }

        if (errorMsg) {
          setError(errorMsg);
          onError?.(errorMsg);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
        onEnd?.();
      };

      recognition.onspeechend = () => {
        recognition.stop();
      };

      recognition.start();
    } catch (err) {
      const errorMsg = "Не удалось запустить голосовой поиск";
      setError(errorMsg);
      onError?.(errorMsg);
      setIsListening(false);
    }
  }, [
    isSupported,
    getSpeechRecognition,
    language,
    interimResults,
    onResult,
    onError,
    onStart,
    onEnd,
  ]);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setIsListening(false);
    setTranscript("");
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
  };
}

export default useVoiceSearch;
