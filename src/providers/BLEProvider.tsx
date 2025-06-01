"use client";

import {
  useRef,
  useState,
} from "react";
// import { TunnelData } from "../types/types";
import { LegoBleConnector } from "../utils/bleConnector";
import {
  ConsoleNotification,
  ProgramFlowNotification,
} from "../utils/bleMessages";

import type { PropsWithChildren } from "react";
import { BLEContext, type CodeStatus, type ConnectionStatus } from "../contexts/BLEContext";
import type { TunnelData } from "../types/types";

type BLEDataCallback = (message: TunnelData) => void;

interface StartProgramOptions {
  code: string;
  onStart: () => Promise<any>;
  onProgress: (percentage: number) => void;
}

const BLEProvider = ({ children }: PropsWithChildren) => {
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("closed");
  const [codeStatus, setCodeStatus] = useState<CodeStatus>("off");
  const [canUseBLE] = useState(() => "bluetooth" in navigator);
  const connectorRef = useRef<LegoBleConnector>(new LegoBleConnector());

  const SLOT = 8; // Static slot

  const connect = async () => {
    connectorRef.current.removeAllListeners();

    connectorRef.current.on("connected", () => {
      setConnectionStatus("open");
    });

    connectorRef.current.on("disconnected", () => {
      setConnectionStatus("closed");
    });

    connectorRef.current.on(
      "programFlowNotification",
      (notification: ProgramFlowNotification) => {
        if (codeStatus === "uploading") return;
        setCodeStatus(notification.stop ? "off" : "on");
      }
    );

    connectorRef.current.on(
      "consoleNotification",
      (notification: ConsoleNotification) => {
        console.log(`Hub console notification:\n${notification.text}`);
      }
    );

    setConnectionStatus("opening");
    try {
      await connectorRef.current.connect();
    } catch (err) {
      setConnectionStatus("closed");
    }
  };

  const disconnect = () => {
    setConnectionStatus("closing");
    connectorRef.current.disconnect();
    connectorRef.current.removeAllListeners();
  };

  const startProgram = async ({
    code,
    onStart,
    onProgress,
  }: StartProgramOptions) => {
    setCodeStatus("uploading");
    try {
      await connectorRef.current.clearSlot(SLOT);
      await connectorRef.current.uploadProgram(
        code,
        SLOT,
        "program.py",
        onProgress
      );
      connectorRef.current.removeAllListeners("tunnelData");

      const tunnelInit = new Promise((resolve, reject) => {
        let resolved = false;
        const resolver = (data: TunnelData) => {
          if (data.action === "program_start") {
            resolved = true;
            resolve(true);
            connectorRef.current.off("tunnelData", resolver);
          }
        };
        connectorRef.current.on("tunnelData", resolver);
        setTimeout(() => {
          if (!resolved) {
            console.error("VM init timeout");
            reject();
            connectorRef.current.off("tunnelData", resolver);
          }
        }, 5000);
      });

      await connectorRef.current.startProgram(SLOT);
      console.log("PROGRAM STARTED");
      await tunnelInit;
      console.log("TUNNEL INITIALIZED");
      await onStart();
      setCodeStatus("on");
    } catch (err) {
      setCodeStatus("off");
    }
  };

  const stopProgram = () => connectorRef.current.stopProgram(SLOT);

  const subscribe = (callback: BLEDataCallback) => {
    connectorRef.current.on("tunnelData", callback);

    // return unsubscribe function
    return () => {
      connectorRef.current.off("tunnelData", callback);
    };
  };

  const sendTunnelData = ({ action, payload }: TunnelData) =>
    connectorRef.current.sendTunnelData({ action, payload });

  return (
    <BLEContext.Provider
      value={{
        canUseBLE,
        codeStatus,
        connectionStatus,
        connect,
        disconnect,
        subscribe,
        stopProgram,
        startProgram,
        sendTunnelData,
      }}
    >
      {children}
    </BLEContext.Provider>
  );
};

export default BLEProvider;
