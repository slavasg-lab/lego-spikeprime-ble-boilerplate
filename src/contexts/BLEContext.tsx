"use client";

import { createContext, useContext } from "react";
import type { TunnelData } from "../types/types";


export type ConnectionStatus = "closed" | "closing" | "open" | "opening";
export type CodeStatus = "on" | "uploading" | "off";

type BLEDataCallback = (message: TunnelData) => void;

interface StartProgramOptions {
  code: string;
  onStart: () => Promise<any>;
  onProgress: (percentage: number) => void;
}

export interface BLEContextValue {
  canUseBLE: boolean;
  disconnect(): void;
  connect(): Promise<void>;
  subscribe(callback: BLEDataCallback): () => void;
  connectionStatus: ConnectionStatus;
  stopProgram(): Promise<boolean>;
  startProgram(options: StartProgramOptions): Promise<void>;
  codeStatus: CodeStatus;
  sendTunnelData(data: TunnelData): Promise<void>;
}

export const BLEContext = createContext<BLEContextValue>({
  canUseBLE: false,
  disconnect: () => {},
  connect: () => Promise.resolve(),
  connectionStatus: "closed",
  subscribe: () => () => {},
  stopProgram: () => Promise.resolve(true),
  startProgram: () => Promise.resolve(),
  sendTunnelData: () => Promise.resolve(),
  codeStatus: "off",
});

export const useBLE = () => useContext(BLEContext);
