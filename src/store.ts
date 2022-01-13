import { syncedStore, getYjsValue } from "@syncedstore/core";
import { WebrtcProvider } from "y-webrtc";
import { IndexeddbPersistence } from "y-indexeddb";
import * as Y from "yjs";
import { useState, useEffect } from "react";

export type Person = {
  name: string;
  time: number;
};

type TimerState = "Waiting" | "Ready" | "Playing" | "Done";

export type InProgress = {
  name?: String;
  start?: number;
};
export type ReservePerson = {
  name: string;
  active?: boolean;
};

export const store = syncedStore({
  people: [] as ReservePerson[],
  onDeck: [] as string[],
  inProgress: {} as Person,
  done: [] as Person[],
});

export const useSync = (name: string) => {
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const doc = getYjsValue(store) as Y.Doc;
    const webrtcProvider = new WebrtcProvider(name, doc);
    const indexdbProvider = new IndexeddbPersistence(name, doc);

    indexdbProvider.on("synced", () => setSynced(true));
    const disconnect = () => webrtcProvider.disconnect();

    return () => {
      disconnect();
    };
  }, []);

  return synced;
};
