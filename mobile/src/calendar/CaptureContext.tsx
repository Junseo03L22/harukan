import { createContext, useContext, useId, useLayoutEffect } from 'react';

export type ImageTracker = { register: (id: string) => () => void; loaded: (id: string) => void; failed: (id: string) => void };
export const CaptureContext = createContext<ImageTracker | null>(null);
export function useCaptureImage(source: string) {
  const tracker = useContext(CaptureContext), id = useId();
  const key = `${id}:${source}`;
  useLayoutEffect(() => tracker?.register(key), [tracker, key]);
  return { capturing: !!tracker, onLoad: () => tracker?.loaded(key), onError: () => tracker?.failed(key) };
}
