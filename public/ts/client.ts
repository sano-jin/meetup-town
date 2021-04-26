import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';
import { UserInfo } from './userInfo';

// Initialize turn/stun server here
const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;

// const remoteVideo = document.querySelector<HTMLVideoElement>('#remoteVideo')!;

// Initializing socket.io
const socket = io();

// Defining some global utility variables
interface ClientState {
    localStream   : null | MediaStream,       // Local camera
    remotes       : Map<string, Remote>,      // A map from socket.id
    localStreamConstraints: StreamConstraints,
}

interface Remote {
    userInfo      : UserInfo,                 // Information of the user
    isChannelReady: boolean,                  // Is channel ready 
    isInitiator   : boolean,                  // Am I a initiator
    isStarted     : boolean,                  // Has started ???
    pc            : null | RTCPeerConnection, // Peer connection
    remoteStream  : null | MediaStream        // Remote camera
}

interface StreamConstraints {
    audio: boolean,
    video: boolean    
}

const clientState: ClientState = {
    localStream   : null,
    remotes       : new Map<string, Remote>(),
    localStreamConstraints : {
        audio: true,
        video: true
    }
}

const getStringFromUser = (message: string): string => {
    let roomName = prompt(message);
    while (roomName === null || roomName === '') {
        roomName = prompt(message);
    }
    return roomName;
}

// Prompting for room name:
const room: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');
socket.emit('create or join', room, { name: userName });
console.log('Attempted to create or join room', room);

socket.on('created', (room: string): void => {
    console.log(`Created room ${room}`);
});

socket.on('join', (room: string, userId: string, userInfo: UserInfo): void => {
    console.log(`Another user ${userId} has joined to our room ${room}`);
    clientState.remotes.set(
        userId,
        {
            userInfo      : userInfo,
            isChannelReady: true,
            isInitiator   : false,           
            isStarted     : false,           
            pc            : null, 
            remoteStream  : null 
        }
    );
    console.log("remotes", clientState.remotes);
//    maybeStart(userId);
    
});


socket.on('joined', (room: string, jsonStrOtherUsers: string): void => {
    console.log(`me joined to the room ${room}`, jsonStrOtherUsers);
    const otherUsers: Map<string, UserInfo> =
        JSON.parse(jsonStrOtherUsers, function(key, val) {
        if (val != null && val.__type__ === 'Map') {
            return new Map(val.__value__);
        }
        return val;
    });
    console.log(otherUsers);
    
    for (const [userId, userInfo] of otherUsers) {
        clientState.remotes.set(
            userId,
            {
                userInfo      : userInfo,
                isChannelReady: true,            
                isInitiator   : true,           
                isStarted     : false,           
                pc            : null, 
                remoteStream  : null 
            }
        );
        maybeStart(userId);
    }
    console.log("remotes", clientState.remotes);
});

socket.on('log', (array: Array<string>): void => {
    console.log(console, ...array);
});


// Driver code
socket.on('message', (userId: string, message: Message, room: string) => {
    console.log('Client received message:', message, room, `from user ${userId}`);
    if (!clientState.remotes.get(userId)) {
        console.log(`remote is null for ${userId}`, message);
    }
    const remote: Remote = clientState.remotes.get(userId)!;
    switch (message.type) {
        case 'got user media':
            maybeStart(userId);
            break;
        case 'offer':
            if (remote.pc === null) return;
            if (!remote.isInitiator && !remote.isStarted) {
                maybeStart(userId);
            }
            remote.pc!
                .setRemoteDescription(message)
                .then(() => doAnswer(remote.pc!));
            break;
        case 'answer':
            if (remote.pc === null) return;
            if (remote.isStarted) {
                remote.pc!.setRemoteDescription(message);
            }
            break;
        case 'candidate':
            if (remote.pc === null) return;
            if (remote.isStarted) {
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                remote.pc!.addIceCandidate(candidate);
            }
            break;
        case 'bye':
            if(remote.isStarted) {
                // handleRemoteHangup(userId);
            }
    }
});

// to send message in a room
const sendMessage = (message: Message, room: string) => {
    console.log('Client sending message: ', message, room);
    socket.emit('message', message, room);
}

console.log("Going to find Local media");
console.log('Getting user media with constraints', clientState.localStreamConstraints);

// If found local stream
const gotStream = (stream: MediaStream): void => {
    console.log('Adding local stream.');
    clientState.localStream = stream;
    localVideo.srcObject = stream;
    sendMessage({type: 'got user media'}, room);
    for (const [userId, remote] of clientState.remotes.entries()) {
        if (remote.isInitiator) {
            maybeStart(userId);
        }
    }
}

navigator.mediaDevices.getUserMedia(clientState.localStreamConstraints)
    .then(gotStream)
    .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If initiator, create the peer connection
const maybeStart = (userId: string): void => {
    const remote: Remote = clientState.remotes.get(userId)!;
    console.log(
        '>>>>>>> maybeStart() ',
        remote.isStarted,
        clientState.localStream,
        remote.isChannelReady
    );
    if (!remote.isStarted
        && clientState.localStream !== null
        && remote.isChannelReady) {
        console.log('>>>>>> creating peer connection');
        remote.pc = createPeerConnection(userId);
        if (remote.pc === null) return;
        if (clientState.localStream === null) return;
        clientState.localStream
            .getTracks()
            .forEach(track => remote.pc!.addTrack(track, clientState.localStream!));
        remote.isStarted = true;
        console.log('isInitiator', remote.isInitiator);
        if (remote.isInitiator) {
            doCall(remote.pc);
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = (): void => {
    sendMessage({type: 'bye'}, room);
};


// Creating peer connection
const createPeerConnection = (userId: string): RTCPeerConnection | null => {
    try {
        const pc = new RTCPeerConnection(pcConfig);
        pc.onicecandidate = handleIceCandidate;
        pc.ontrack = handleRemoteStream(userId);
        // pc.onremovestream = handleRemoteStreamRemoved;
        // Somehow deprecated ...
        console.log('Created RTCPeerConnnection');
        return pc;
    } catch (e) {
        console.log(`Failed to create PeerConnection, exception: ${e.message}`);
        alert('Cannot create RTCPeerConnection object.');
        return null;
    }
}

// to handle Ice candidates
const handleIceCandidate = (event: RTCPeerConnectionIceEvent): void => {
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

const handleCreateOfferError = (event: DOMException): void => {
    console.log('createOffer() error: ', event);
}

const doCall = (pc: RTCPeerConnection): void => {
    console.log('Sending offer to peer');
    pc.createOffer()
        .then(setLocalAndSendMessage(pc))
        .catch(handleCreateOfferError);
}

const doAnswer = (pc: RTCPeerConnection): void => {
    console.log('Sending answer to peer.');
    pc.createAnswer()
        .then(setLocalAndSendMessage(pc))
        .catch(onCreateSessionDescriptionError);
}

const setLocalAndSendMessage =
    (pc: RTCPeerConnection) =>
    (sessionDescription: RTCSessionDescriptionInit): void => {
        pc.setLocalDescription(sessionDescription);
        console.log('setLocalAndSendMessage sending message', sessionDescription);
        sendMessage(sessionDescription, room);
    }

const onCreateSessionDescriptionError = (error: DOMException): void => {
    console.trace(`Failed to create session description: ${error.toString()}`);
}


const handleRemoteStream = (userId: string) => (event: RTCTrackEvent): void => {
    if (event.streams.length >= 1) {
        console.log(`Remote stream of userId ${userId} added.`);
        clientState.remotes.get(userId)!.remoteStream = event.streams[0];
    } else {
        console.log(`Remote stream of userId ${userId} removed.`);
        clientState.remotes.get(userId)!.remoteStream = null;
    }

    console.log("clientState.remotes", clientState.remotes);
    
    // TODO: Replace these with React or something ...
    while (remoteVideos.firstChild) {
        remoteVideos.removeChild(remoteVideos.firstChild);
    }

    for (const [userId, remote] of clientState.remotes) {
        console.log(`remote.remoteStream of user ${userId}`, remote.remoteStream);
        if (remote.remoteStream === null) {
            console.log(`remoteStream of user ${userId} is null`);
            continue;
        }
        console.log(`adding ${userId} of ${remote.remoteStream!.id}`);
        const item = document.createElement("li");
        item.className = `remote_div username_${userId}`;
        const videoElement = document.createElement("video")
        videoElement.srcObject = remote.remoteStream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        item.appendChild(videoElement);
        remoteVideos.appendChild(item);
    }
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
