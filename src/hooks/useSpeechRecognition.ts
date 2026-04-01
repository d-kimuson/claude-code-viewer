import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechRecognitionOptions = {
  /** Called with the final transcript text when speech is recognized */
  onTranscript: (text: string) => void;
  /** Called with interim (not yet finalized) transcript text */
  onInterimTranscript?: (text: string) => void;
};

type UseSpeechRecognitionReturn = {
  /** Whether the browser supports the Web Speech API */
  isSupported: boolean;
  /** Whether speech recognition is currently active */
  isListening: boolean;
  /** Array of ~4 normalized audio level values (0-1) for waveform visualization */
  audioLevels: number[];
  /** Toggle speech recognition on/off */
  toggle: () => void;
};

const getSpeechRecognitionAPI = (): SpeechRecognitionConstructor | undefined => {
  if (typeof window === "undefined") return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
};

const AUDIO_LEVEL_BINS = 4;
const INITIAL_LEVELS: number[] = [0, 0, 0, 0];

export const useSpeechRecognition = ({
  onTranscript,
  onInterimTranscript,
}: UseSpeechRecognitionOptions): UseSpeechRecognitionReturn => {
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(INITIAL_LEVELS);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Use refs for callbacks to avoid re-creating recognition on every render
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;
  const onInterimTranscriptRef = useRef(onInterimTranscript);
  onInterimTranscriptRef.current = onInterimTranscript;

  const isSupported = getSpeechRecognitionAPI() !== undefined;

  const stopAudioAnalysis = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {
        // Ignore errors when closing audio context
      });
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    setAudioLevels(INITIAL_LEVELS);
  }, []);

  const startAudioAnalysis = useCallback(async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevels = () => {
        const currentAnalyser = analyserRef.current;
        if (!currentAnalyser) return;

        currentAnalyser.getByteFrequencyData(dataArray);

        const binCount = dataArray.length;
        const binSize = Math.floor(binCount / AUDIO_LEVEL_BINS);
        const levels: number[] = [];

        for (let i = 0; i < AUDIO_LEVEL_BINS; i++) {
          const start = i * binSize;
          const end = Math.min(start + binSize, binCount);
          let sum = 0;
          for (let j = start; j < end; j++) {
            sum += dataArray[j] ?? 0;
          }
          const avg = end > start ? sum / (end - start) : 0;
          levels.push(avg / 255);
        }

        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };

      animationFrameRef.current = requestAnimationFrame(updateLevels);
      return true;
    } catch {
      // Permission denied or other error - continue without audio visualization
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognitionRef.current = null; // Clear first so onend handler is no-op
      recognition.stop();
    }
    stopAudioAnalysis();
    setIsListening(false);
  }, [stopAudioAnalysis]);

  const start = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionAPI();
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = navigator.language;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = "";
      let interimTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;

        const alternative = result[0];
        if (!alternative) continue;

        if (result.isFinal) {
          finalTranscript += alternative.transcript;
        } else {
          interimTranscript += alternative.transcript;
        }
      }

      if (finalTranscript) {
        onTranscriptRef.current(finalTranscript);
      }
      if (interimTranscript) {
        onInterimTranscriptRef.current?.(interimTranscript);
      }
    };

    recognition.onerror = () => {
      stop();
    };

    recognition.onend = () => {
      // If a new session has started, this onend is for an old instance - ignore it
      if (recognitionRef.current !== recognition) return;
      // Recognition ended (possibly automatically) - clean up
      recognitionRef.current = null;
      stopAudioAnalysis();
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true); // Set immediately to prevent double-click

    // Start recognition immediately (it handles its own permission request)
    try {
      recognition.start();
    } catch {
      stop();
      return;
    }

    // Start audio analysis in parallel for waveform visualization (optional)
    void startAudioAnalysis().then(() => {
      // If stop() was called while we were awaiting getUserMedia, clean up
      if (recognitionRef.current !== recognition) {
        stopAudioAnalysis();
      }
    });
  }, [startAudioAnalysis, stop, stopAudioAnalysis]);

  const toggle = useCallback(() => {
    if (isListening) {
      stop();
    } else {
      start();
    }
  }, [isListening, start, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (mediaStreamRef.current) {
        for (const track of mediaStreamRef.current.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  return { isSupported, isListening, audioLevels, toggle };
};
