/*global io, turnConfig*/

'use strict';

// Defining some global utility variables
let isChannelReady = false;   // Is channel ready 
let isInitiator = false;      // Am I a initiator
let isStarted = false;        // Has started ???
let localStream = undefined;  // 
let pc;
let remoteStream;
let turnReady

// Initialize turn/stun server here
const pcConfig = turnConfig;

const localStreamConstraints = {
    audio: true,
    video: true
};


// Prompting for room name:
const room = prompt('Enter room name:');

// Initializing socket.io
const socket = io.connect();

if (room !== '') {
    socket.emit('create or join', room);
    console.log('Attempted to create or join room', room);
}

// Defining socket connections for signalling
socket.on('created', (room) => {
    console.log(`Created room ${room}`);
    isInitiator = true;
});

socket.on('full', (room) => {
    console.log(`Room ${room} is full`);
});

socket.on('join', (room) => {
    console.log(`Another peer made a request to join room ${room}`);
    console.log(`This peer is the initiator of room ${room} !`);
    isChannelReady = true;
});

socket.on('joined', (room) => {
    console.log(`joined: ${room}`);
    isChannelReady = true;
});

socket.on('log', (...array) => {
    console.log(console, ...array);
});


// Driver code
socket.on('message', (message, room) => {
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
const sendMessage = (message, room) => {
    console.log('Client sending message: ', message, room);
    socket.emit('message', message, room);
}


// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
console.log("Going to find Local media");
navigator.mediaDevices.getUserMedia(localStreamConstraints)
    .then(gotStream)
    .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If found local stream
function gotStream(stream) {
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
        pc.addStream(localStream);
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
        pc.onaddstream = handleRemoteStreamAdded;
        pc.onremovestream = handleRemoteStreamRemoved;
        console.log('Created RTCPeerConnnection');
    } catch (e) {
        console.log(`Failed to create PeerConnection, exception: ${e.message}`);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

// to handle Ice candidates
function handleIceCandidate(event) {
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

function handleCreateOfferError(event) {
    console.log('createOffer() error: ', event);
}

function doCall() {
    console.log('Sending offer to peer');
    pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer().then(
        setLocalAndSendMessage,
        onCreateSessionDescriptionError
    );
}

function setLocalAndSendMessage(sessionDescription) {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, room);
}

function onCreateSessionDescriptionError(error) {
    console.trace(`Failed to create session description: ${error.toString()}`);
}


function handleRemoteStreamAdded(event) {
    console.log('Remote stream added.');
    remoteStream = event.stream;
    remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
    console.log('Remote stream removed. Event: ', event);
}

function hangup() {
    console.log('Hanging up.');
    stop();
    sendMessage('bye', room);
    remoteVideo.srcObject = undefined; // hide remote video
}

function handleRemoteHangup() {
    console.log('Session terminated.');
    stop();
    isInitiator = false;
    remoteVideo.srcObject = undefined; // hide remote video
}

function stop() {
    isStarted = false;
    pc.close();
    pc = null;
}
