export {
    localVideo,
    remoteVideos,
    chatBoard,
    textbox,
    sendButton
};

import * as React from 'react';
import * as ReactDOM from "react-dom";

// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;
const chatBoard = document.querySelector<HTMLDivElement>('#chatBoard')!;
const textbox = document.querySelector<HTMLTextAreaElement>("#input-message")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-button")!;
