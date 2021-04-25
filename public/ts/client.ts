import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';

interface ClientState {
    // Defining some global utility variables
    isChannelReady: boolean,                  // Is channel ready 
    isInitiator   : boolean,                  // Am I a initiator
    isStarted     : boolean,                  // Has started ???
    localStream   : null | MediaStream,       // Local camera
    pc            : null | RTCPeerConnection, // Peer connection
    remoteStream  : null | MediaStream        // Remote camera
}

const clientState: ClientState = {
    isChannelReady: false,
    isInitiator: false,
    isStarted: false,
    localStream: null,
    pc: null,
    remoteStream: null
}

// Initialize turn/stun server here
const pcConfig = turnConfig;

// TODO: include this in the "clientState"
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
socket.on('message', (message: Message, room: string) => {
    console.log('Client received message:', message, room);
    switch (message.type) {
        case 'got user media':
            maybeStart();
            break;
        case 'offer':
            if (!isInitiator && !isStarted) {
                maybeStart();
            }
            pc.setRemoteDescription(message);
            doAnswer();
            break;
        case 'answer':
            if (isStarted) {
                pc.setRemoteDescription(message);
            }
            break;
        case 'candidate':
            if (isStarted) {
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                pc.addIceCandidate(candidate);
            }
            break;
        case 'bye':
            if(isStarted) {
                handleRemoteHangup();
            }
    }
});



// to send message in a room
const sendMessage = (message: Message, room: string) => {
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
function gotStream(stream: MediaStream): void {
    console.log('Adding local stream.');
    localStream = stream;
    localVideo.srcObject = stream;
    sendMessage({type: 'got user media'}, room);
    if (isInitiator) {
        maybeStart();
    }
}


console.log('Getting user media with constraints', localStreamConstraints);

// If initiator, create the peer connection
function maybeStart(): void {
    console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
    if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        localStream.getTracks()
            .forEach(track => pc.addTrack(track, localStream));
        isStarted = true;
        console.log('isInitiator', isInitiator);
        if (isInitiator) {
            doCall();
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = (): void => {
    sendMessage({type: 'bye'}, room);
};


// Creating peer connection
function createPeerConnection(): void {
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
function handleIceCandidate(event: RTCPeerConnectionIceEvent): void {
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

function handleCreateOfferError(event: DOMException): void {
    console.log('createOffer() error: ', event);
}

function doCall(): void {
    console.log('Sending offer to peer');
    pc.createOffer().then(
        setLocalAndSendMessage,
        handleCreateOfferError
    );
}

function doAnswer(): void {
    console.log('Sending answer to peer.');
    pc.createAnswer()
        .then(setLocalAndSendMessage)
        .catch(onCreateSessionDescriptionError);
}

function setLocalAndSendMessage(sessionDescription: RTCSessionDescriptionInit): void {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, room);
}

function onCreateSessionDescriptionError(error: DOMException): void {
    console.trace(`Failed to create session description: ${error.toString()}`);
}


function handleRemoteStreamAdded(event: RTCTrackEvent): void {
    if (event.streams.length >= 1) {
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

function hangup(): void {
    console.log('Hanging up.');
    stop();
    sendMessage({type: 'bye'}, room);
    remoteVideo.srcObject = null; // hide remote video
}

function handleRemoteHangup(): void {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
    remoteVideo.srcObject = null; // hide remote video
}

function stop(): void {
    isStarted = false;
    pc.close();
//     pc = null;
}
