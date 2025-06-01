"use client";

import { useState } from "react";
import Button from "./components/Button/Button";
import {
  LinkIcon,
  LinkOffIcon,
  PlayIcon,
  SmileIcon,
  StopIcon,
} from "./components/Icons/Icons";
import { useBLE } from "./contexts/BLEContext";
import styled from "styled-components";
import AceEditor from "react-ace";
import defaultCode from "./assets/defaultCode";
import "ace-builds/src-noconflict/ace";
import "brace/theme/github";
import "brace/mode/python";
import type { TunnelData } from "./types/types";

const portStates = {
  closed: "Connect hub",
  open: "Disconnect hub",
  opening: "Connecting...",
  closing: "Disconnecting...",
};

function App() {
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const {
    connect,
    disconnect,
    connectionStatus,
    codeStatus,
    startProgram,
    stopProgram,
    sendTunnelData,
    subscribe,
  } = useBLE();

  const [code, setCode] = useState<string>(defaultCode);

  const [outputMessages, setOutputMessages] = useState<string[]>([]);

  const handleSmile = () => {
    sendTunnelData({
      action: "show_smile",
      payload: {},
    }).then(() => {});
  };

  const tunnelMessageListener = (data: TunnelData) => {
    // const messageData = data.payload; # you can use payload as well if you want

    switch (data.action) {
      case "clicked":
        setOutputMessages((prev) => [
          ...prev,
          "You clicked on the right button.",
        ]);
        break;
      default:
        break;
    }
  };

  const onStart = async () => {
    subscribe(tunnelMessageListener);
    setOutputMessages((prev) => [...prev, "Code successfully started!"]);
  };

  const handleRunCode = async () => {
    if (codeStatus === "on") await stopProgram();
    if (codeStatus === "off")
      await startProgram({
        code,
        onStart,
        onProgress: (percentage: number) => setUploadProgress(percentage),
      });
  };

  return (
    <Wrapper>
      <h1>LEGO BLE CONNECTOR</h1>
      <p>
        This interface launches an app that can make you hub smile and that can
        detect if you clicked the right button.
      </p>
      <ButtonRow>
        <Button
          onClick={connectionStatus === "open" ? disconnect : connect}
          text={portStates[connectionStatus]}
          icon={
            (connectionStatus === "closed" && <LinkIcon />) ||
            (connectionStatus === "open" && <LinkOffIcon />)
          }
          loading={["closing", "opening"].includes(connectionStatus)}
        />
        {connectionStatus === "open" && (
          <Button
            onClick={handleRunCode}
            text={codeStatus === "on" ? "Stop code" : "Launch code"}
            icon={
              (codeStatus === "off" && <PlayIcon />) ||
              (codeStatus === "on" && <StopIcon />)
            }
            loading={codeStatus === "uploading"}
            loadingProgress={uploadProgress}
          />
        )}
        {codeStatus === "on" && (
          <Button
            onClick={handleSmile}
            text={"Smiiiiile"}
            icon={<SmileIcon />}
          />
        )}
      </ButtonRow>
      <OutputBox>
        {outputMessages.map((el, ix) => (
          <p key={ix}>{el}</p>
        ))}
      </OutputBox>
      <Button
        onClick={() => setOutputMessages([])}
        text={"Clear output"}
      />
      <AceEditor
        mode="python"
        onChange={(newCode) => setCode(newCode)}
        value={code}
        theme="github"
        width="100%"
        height="100vw"
        lineHeight={24}
      />
    </Wrapper>
  );
}

const Wrapper = styled.div`
  min-height: 100vh;
  width: 900px;
  margin: 0 auto;
  padding: 50px 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ButtonRow = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
`;

const OutputBox = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 5px;
  border: 1px solid black;
  height: 300px;
  overflow-y: scroll;
  padding: 10px;
  gap: 5px;
`;

export default App;
