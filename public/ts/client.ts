import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';

// Initialize turn/stun server here
const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideos =
    document
    .getElementById<HTMLUlElement>('#remotes')!

// const remoteVideo = document.querySelector<HTMLVideoElement>('#remoteVideo')!;


interface ClientState {
    // Defining some global utility variables
    isChannelReady: boolean,                  // Is channel ready 
    isInitiator   : boolean,                  // Am I a initiator
    isStarted     : boolean,                  // Has started ???
    localStream   : null | MediaStream,       // Local camera
    remotes       : Array<Remote>,
    //     pc            : null | RTCPeerConnection, // Peer connection
    //     remoteStream  : null | MediaStream        // Remote camera
    localStreamConstraints: StreamConstraints,
}

interface Remote {
    pc            : RTCPeerConnection, // Peer connection
    remoteStream  : MediaStream        // Remote camera
}

interface StreamConstraints {
    audio: boolean,
    video: boolean    
}

const clientState: ClientState = {
    isChannelReady: false,
    isInitiator   : false,
    isStarted     : false,
    localStream   : null,
    remotes       : [],
    localStreamConstraints : {
        audio: true,
        video: true
    }
}

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
    clientState.isInitiator = true;
});

// Appointed as the next host
socket.on('appoint', (room: string): void => {
    console.log(`Room ${room} is full`);
    clientState.isInitiator = true;
    clientState.isChannelReady = true;
});

socket.on('join', (room: string): void => {
    console.log(`Another peer made a request to join room ${room}`);
    console.log(`This peer is the initiator of room ${room} !`);
    clientState.isChannelReady = true;
});

socket.on('joined', (room: string): void => {
    console.log(`joined: ${room}`);
    clientState.isChannelReady = true;
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
            if (!clientState.isInitiator && !clientState.isStarted) {
                maybeStart();
            }
            pc.setRemoteDescription(message);
            doAnswer();
            break;
        case 'answer':
            if (clientState.isStarted) {
                pc.setRemoteDescription(message);
            }
            break;
        case 'candidate':
            if (clientState.isStarted) {
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                pc.addIceCandidate(candidate);
            }
            break;
        case 'bye':
            if(clientState.isStarted) {
                handleRemoteHangup();
            }
    }
});



// to send message in a room
const sendMessage = (message: Message, room: string) => {
    console.log('Client sending message: ', message, room);
    socket.emit('message', message, room);
}



console.log("Going to find Local media");

navigator.mediaDevices.getUserMedia(localStreamConstraints)
    .then(gotStream)
    .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If found local stream
const gotStream(stream: MediaStream): void => {
    console.log('Adding local stream.');
    clientState.localStream = stream;
    localVideo.srcObject = stream;
    sendMessage({type: 'got user media'}, room);
    if (clientState.isInitiator) {
        maybeStart();
    }
}


console.log('Getting user media with constraints', localStreamConstraints);

// If initiator, create the peer connection
const maybeStart(): void => {
    console.log(
        '>>>>>>> maybeStart() ',
        clientState.isStarted,
        clientState.localStream,
        clientState.isChannelReady
    );
    if (!clientState.isStarted
        && clientState.localStream !== null
        && clientState.isChannelReady) {
        console.log('>>>>>> creating peer connection');
        createPeerConnection();
        clientState.localStream.getTracks()
            .forEach(track => pc.addTrack(track, clientState.localStream));
        clientState.isStarted = true;
        console.log('clientState.isInitiator', clientState.isInitiator);
        if (clientState.isInitiator) {
            doCall();
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = (): void => {
    sendMessage({type: 'bye'}, room);
};


// Creating peer connection
const createPeerConnection(): RTCPeerConnection | null => {
    try {
        const pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.ontrack = handleRemoteStreamAdded;
        // pc.onremovestream = handleRemoteStreamRemoved;
        // Somehow deprecated ...
        console.log('Created RTCPeerConnnection');
        return pc;
    } catch (e) {
        console.log(`Failed to create PeerConnection, exception: ${e.message}`);
        alert('Cannot create RTCPeerConnection object.');
        return;
    }
}

// to handle Ice candidates
const handleIceCandidate(event: RTCPeerConnectionIceEvent): void => {
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

const handleCreateOfferError(event: DOMException): void => {
    console.log('createOffer() error: ', event);
}

const doCall(): void => {
    console.log('Sending offer to peer');
    pc.createOffer().then(
        setLocalAndSendMessage,
        handleCreateOfferError
    );
}

const doAnswer(): void => {
    console.log('Sending answer to peer.');
    pc.createAnswer()
        .then(setLocalAndSendMessage)
        .catch(onCreateSessionDescriptionError);
}

const setLocalAndSendMessage(sessionDescription: RTCSessionDescriptionInit): void => {
    pc.setLocalDescription(sessionDescription);
    console.log('setLocalAndSendMessage sending message', sessionDescription);
    sendMessage(sessionDescription, room);
}

const onCreateSessionDescriptionError(error: DOMException): void => {
    console.trace(`Failed to create session description: ${error.toString()}`);
}


const handleRemoteStreamAdded(event: RTCTrackEvent): void => {
    if (event.streams.length >= 1) {
        console.log('Remote stream added.');
    }        

    clientState.remotes = event.streams;

    // TODO: Replace these with React or something ...
    while (listElem.firstChild) {
        listElem.removeChild(listElem.firstChild);
    }

    clientState.remotes.forEach((stream: MediaStream) => {
        const item = document.createElement("li");
        const videoElement = document..createElement("video")
        videoElement.srcObject = stream;
        item.appendChild(videoElement);
        remoteVideos.appendChild(item);
    });
}

/*
Based on the deprected implementation of RTCPeerConnection.
const handleRemoteStreamRemoved(event: MediaStreamEvent) => {
    console.log('Remote stream removed. Event: ', event);
}
*/

/*
const hangup(): void => {
    console.log('Hanging up.');
    stop();
    sendMessage({type: 'bye'}, room);
    remoteVideo.srcObject = null; // hide remote video
}

const handleRemoteHangup(): void => {
    console.log('Session terminated.');
    stop();
    clientState.isInitiator = false;
    remoteVideo.srcObject = null; // hide remote video
}

const stop(): void => {
    clientState.isStarted = false;
    pc.close();
//     pc = null;
}

*/
