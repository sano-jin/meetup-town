import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';
import { UserInfo, UserId } from './userInfo';
import { json2Map } from '../../src/util'
import { ClientState, Remote } from './clientState'

// Initialize turn/stun server here
const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;


// Initializing socket.io
const socket = io();

// Defining some global utility variables
const clientState: ClientState = {
    userId: null,
    localStream: null,
    remotes: new Map<string, Remote>(),
    localStreamConstraints: {
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
socket.emit('create or join', room, { userName: userName });
console.log('Attempted to create or join room', room);

socket.on('created', (room: string, userId: UserId): void => {
    console.log(`Created room ${room}`);
    clientState.userId = userId;
});

socket.on('join', (room: string, userId: UserId, userInfo: UserInfo): void => {
    console.log(`Another user ${userId} has joined to our room ${room}`);
    clientState.remotes.set(
        userId,
        {
            userInfo: userInfo,
            isChannelReady: true,
            isInitiator: false,
            isStarted: false,
            pc: null,
            remoteStream: null
        }
    );
    console.log("remotes", clientState.remotes);
    //    maybeStart(userId);

});


socket.on('joined', (room: string, userId: UserId, jsonStrOtherUsers: string): void => {
    console.log(`me joined to the room ${room}`, jsonStrOtherUsers);
    clientState.userId = userId;

    const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);
    console.log(otherUsers);

    for (const [userId, userInfo] of otherUsers) {
        clientState.remotes.set(
            userId,
            {
                userInfo: userInfo,
                isChannelReady: true,
                isInitiator: true,
                isStarted: false,
                pc: null,
                remoteStream: null
            }
        );
        // maybeStart(userId);
    }
    console.log("remotes", clientState.remotes);
});

socket.on('log', (array: Array<string>): void => {
    console.log(console, ...array);
});


// Driver code
socket.on('message', (userId: UserId, message: Message, room: string) => {
    if (message.type !== 'candidate') {
        console.log('Client received message:', message, `from user ${userId} in room ${room}`);
    }
    if (!clientState.remotes.has(userId)) {
        throw Error(`remote is null for ${userId}`);
    }
    const remote: Remote = clientState.remotes.get(userId)!;
    switch (message.type) {
        case 'got user media':
            maybeStart(userId);
            break;
        case 'offer':
            if (remote.pc === null)
                throw Error(`received an offer but the peer connection is null`);
            if (!remote.isInitiator && !remote.isStarted) {
                console.log(`starting communication with ${userId} with an offer`);
                maybeStart(userId);
            }
            remote.pc
                .setRemoteDescription(message)
                .then(() => {
                    if (remote.pc !== null) {
                        doAnswer(remote.pc, userId);
                    }
                })
                .catch(e => console.log(e));
            break;
        case 'answer':
            if (remote.pc === null)
                throw Error(`received an answer but the peer connection is null`);
            if (remote.isStarted) {
                remote.pc.setRemoteDescription(message)
                    .catch(e => console.log(e));
            }
            break;
        case 'candidate':
            if (remote.pc === null)
                throw Error(`received a candidate but the peer connection is null`);
            if (remote.isStarted) {
                const candidate = new RTCIceCandidate({
                    sdpMLineIndex: message.label,
                    candidate: message.candidate
                });
                remote.pc.addIceCandidate(candidate);
            }
            break;
        case 'bye':
            if (remote.isStarted) {
                // handleRemoteHangup(userId);
            }
    }
});

// to send message in a room
const sendMessage = (message: Message, toRoom: string, toUserId?: UserId): void => {
    // console.log('Client sending message: ', message, toRoom, toUserId);
    if (clientState.userId === null) {
        setTimeout(sendMessage, 500, message, toRoom, toUserId);
        return;
    }
    socket.emit('message', clientState.userId, message, toRoom, toUserId);
}

console.log("Going to find Local media");
console.log('Getting user media with constraints', clientState.localStreamConstraints);

// If found local stream
const gotStream = (stream: MediaStream): void => {
    console.log('Adding local stream.');
    clientState.localStream = stream;
    localVideo.srcObject = stream;
    const sendGotUserMedia = () => {
        if (clientState.userId === null) {
            setTimeout(sendGotUserMedia, 500);
            return;
        }
        for (const [userId, remote] of clientState.remotes.entries()) {
            sendMessage({ type: 'got user media' }, room, userId);
            if (remote.isInitiator) {
                maybeStart(userId);
            }
        }
    }
    sendGotUserMedia();
}

navigator.mediaDevices.getUserMedia(clientState.localStreamConstraints)
    .then(gotStream)
    .catch((e) => {
        alert(`getUserMedia() error: ${e.name}`);
    });

// If initiator, create the peer connection
const maybeStart = (userId: UserId): void => {
    const remote: Remote = clientState.remotes.get(userId)!;
    console.log(
        '>>>>>>> maybeStart() ',
        userId,
        remote.isStarted,
        clientState.localStream,
        remote.isChannelReady
    );
    if (!remote.isStarted
        && clientState.localStream !== null
        && remote.isChannelReady) {
        console.log('>>>>>> creating peer connection', userId);
        remote.pc = createPeerConnection(userId);
        if (remote.pc === null) throw Error(`Peer connection to ${userId} is null`);
        if (clientState.localStream === null) throw Error(`Local stream is null`);;
        clientState.localStream
            .getTracks()
            .forEach(track => remote.pc!.addTrack(track, clientState.localStream!));
        remote.isStarted = true;
        console.log('isInitiator', remote.isInitiator);
        if (remote.isInitiator) {
            // doCall(remote.pc, userId);
        }
    }
}

// Sending bye if user closes the window
window.onbeforeunload = (): void => {
    sendMessage({ type: 'bye' }, room);
};


// Creating peer connection
const createPeerConnection =
    (userId: UserId): RTCPeerConnection | null => {
        try {
            const pc = new RTCPeerConnection(pcConfig);
            pc.onicecandidate = handleIceCandidate(userId);
            pc.ontrack = handleRemoteStream(userId);
            pc.onnegotiationneeded = handleNegotiationNeededEvent(pc, userId);
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

const handleNegotiationNeededEvent = (pc: RTCPeerConnection, userId: UserId) => () => {
    console.log(`handleNegotiationNeededEvent`, userId);
    pc.createOffer()
        .then((sessionDescription) => {
            if (clientState.remotes.get(userId)!.isInitiator) {
                pc.setLocalDescription(sessionDescription)
                    .then(() => sendMessage(sessionDescription, room, userId));
            }
        })
        .catch(e => console.log(e));
}

// to handle Ice candidates
const handleIceCandidate =
    (userId: UserId) => (event: RTCPeerConnectionIceEvent): void => {
        // console.log('icecandidate event: ', event);
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }, room, userId);
        } else {
            console.log('End of candidates.');
        }
    }

const handleCreateOfferError = (event: DOMException): void => {
    console.log('createOffer() error: ', event);
}

const doCall = (pc: RTCPeerConnection, userId: UserId): void => {
    console.log(`Sending offer to peer ${userId}`);
    pc.createOffer()
        .then(setLocalAndSendMessage(pc, userId))
        .catch(handleCreateOfferError);
}

const doAnswer = (pc: RTCPeerConnection, userId: UserId): void => {
    console.log(`Sending answer to peer ${userId}`);
    pc.createAnswer()
        .then(setLocalAndSendMessage(pc, userId))
        .catch(onCreateSessionDescriptionError);
}

const setLocalAndSendMessage =
    (pc: RTCPeerConnection, userId: UserId) =>
        (sessionDescription: RTCSessionDescriptionInit): void => {
            pc.setLocalDescription(sessionDescription)
                .then(() => {
                    console.log(`setLocalAndSendMessage sending message to ${userId}`,
                        sessionDescription);
                    sendMessage(sessionDescription, room, userId);
                })
                .catch(e => console.log(e));
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
    remoteVideos.textContent = null;

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
