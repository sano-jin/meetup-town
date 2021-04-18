/*global io, turnConfig*/
import io from "socket.io-client";
import { turnConfig } from './config';

interface Message {
    type: string,
    label: RTCIceCandidate["sdpMLineIndex"],
    id: RTCIceCandidate["sdpMid"],
    candidate: RTCIceCandidate["candidate"]
}

// Defining some global utility variables
let isChannelReady = false;   // Is channel ready 
let isInitiator = false;      // Am I a initiator
let isStarted = false;        // Has started ???
let localStream: MediaStreamTrack;  // 
let pc: RTCPeerConnection;
let remoteStream: MediaStream;
let turnReady // does not used at all

// Initialize turn/stun server here
const pcConfig = turnConfig;

const localStreamConstraints = {
    audio: true,
    video: true
};


// Prompting for room name:
const room: string = prompt('Enter room name:')!;

// Initializing socket.io
const socket = io();

if (room !== '') {
    socket.emit('create or join', room);
    console.log('Attempted to create or join room', room);
}

// Defining socket connections for signalling
socket.on('created', (room: string): void => {
    console.log(`Created room ${room}`);
    isInitiator = true;
});

socket.on('full', (room: string): void => {
    console.log(`Room ${room} is full`);
});

socket.on('join', (room: string): void => {
    console.log(`Another peer made a request to join room ${room}`);
    console.log(`This peer is the initiator of room ${room} !`);
    isChannelReady = true;
});

socket.on('joined', (room: string): void => {
    console.log(`joined: ${room}`);
    isChannelReady = true;
});

socket.on('log', (...array: Array<string>): void => {
    console.log(console, ...array);
});


// Driver code
socket.on('message', (message, room: string) => {
    console.log('Client received message:', message, room);
    if (message === 'got user media') {
        maybeStart();
    } else if (message.type === 'offer') {
        if (!isInitiator && !isStarted) {
            maybeStart();
        }
        pc.setRemoteDescription(new RTCSessionDescription(message));
        doAnswer();
    } else if (message.type === 'answer' && isStarted) {
        pc.setRemoteDescription(new RTCSessionDescription(message));
    } else if (message.type === 'candidate' && isStarted) {
        const candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
        });
        pc.addIceCandidate(candidate);
    } else if (message === 'bye' && isStarted) {
        handleRemoteHangup();
        
    }
});



// to send message in a room
const sendMessage = (message: string, room: string) => {
    console.log('Client sending message: ', message, room);
    socket.emit('message', message, room);
}


// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideo = document.querySelector<HTMLVideoElement>('#remoteVideo')!;

console.log("Going to find Local media");

navigator.mediaDevices.getUserMedia(localStreamConstraints)
    .then(gotStream)
    .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If found local stream
function gotStream(stream: MediaStream) {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage('got user media', room);
    if (isInitiator) {
        maybeStart();
    }
}


console.log('Getting user media with constraints', localStreamConstraints);

// If initiator, create the peer connection
function maybeStart() {
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        pc.addTrack(localStream);
        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = () => {
    sendMessage('bye', room);
};


// Creating peer connection
function createPeerConnection() {
    try {
        pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.ontrack = handleRemoteStreamAdded;
        // pc.onremovestream = handleRemoteStreamRemoved;
        // Somehow deprecated ...
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log(`Failed to create PeerConnection, exception: ${e.message}`);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

// to handle Ice candidates
function handleIceCandidate(event: RTCPeerConnectionIceEvent) {
    console.log('icecandidate event: ', event);
    if (event.candidate) {
        sendMessage({
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate
        }, room);
    } else {
        console.log('End of candidates.');
    }
}

function handleCreateOfferError(event: DOMException) {
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer().then(
        setLocalAndSendMessage,
        handleCreateOfferError
    );
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription: RTCSessionDescriptionInit) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, room);
}

function onCreateSessionDescriptionError(error: DOMException) {
    console.trace(`Failed to create session description: ${error.toString()}`);
}


function handleRemoteStreamAdded(event: RTCTrackEvent) {
    if (event.streams.length === 1) {
        console.log('Remote stream added.');
        remoteStream = event.streams[0];
        remoteVideo.srcObject = remoteStream;
    } else {
        console.log('Remote stream removed. Event: ', event);
    }
}

/*
Based on the deprected implementation of RTCPeerConnection.
function handleRemoteStreamRemoved(event: MediaStreamEvent) {
    console.log('Remote stream removed. Event: ', event);
}
*/

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye', room);
    remoteVideo.srcObject = null; // hide remote video
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
    remoteVideo.srcObject = null; // hide remote video
}

function stop() {
    isStarted = false;
    pc.close();
//     pc = null;
}
