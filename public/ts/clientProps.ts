/** 
 * An auxiliary functions for 'client'
 */
export {
    initialClientState,
    anotherUserJoin,
    myJoin,
    onMessage,
    getLocalStream,
}

import io from "socket.io-client";
// import { turnConfig } from './config';
import { Message } from './message';
import { UserInfo, UserId } from './userInfo';
import { json2Map, /* getStringFromUser, */ waitNonNull } from '../../src/util'
import { ClientState, Remote } from './clientState'

// Initialize turn/stun server here
// const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
// const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
// const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;


// Initializing socket.io
// const socket = io();

// Prompting for room name:
// const roomName: string = getStringFromUser('Enter room name:');
// const userName: string = getStringFromUser('Enter your name:');

// Defining some global utility variables
const initialClientState =
    (userName: string, roomName: string): ClientState => {
        return {
            userId: null,
            roomName: roomName;
            userInfo: { userName: userName },
            localStream: null,
            remotes: new Map<UserId, Remote>(),
            localStreamConstraints: {
                audio: true,
                video: true
            }
        }
    };

const anotherUserJoin =
    (clientState: ClientState) =>
        (roomName: string, userId: UserId, userInfo: UserInfo): ClientState => {
            console.log(`Another user ${userId} has joined to our room ${roomName}`);
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
            return clientState;
        };

const myJoin =
    (clientState: ClientState) =>
        (roomName: string, myUserId: UserId, jsonStrOtherUsers: string): ClientState => {
            console.log(`me joined to the room ${roomName} with userId ${myUserId}`,
                jsonStrOtherUsers);

            clientState.userId = myUserId;

            const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);

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
            }
            console.log("remotes", clientState.remotes);
            return clientState;
        };

const onMessage =
    (clientState: ClientState) =>
        (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') {
                console.log('Client received message:', message, `from user ${userId}`);
            }
            if (!clientState.remotes.has(userId)) {
                throw Error(`remote is null for ${userId}`);
            }
            const remote: Remote = clientState.remotes.get(userId)!;
            switch (message.type) {
                case 'got user media':
                    maybeStart(userId);
                    break;
                case 'bye':
                    if (remote.isStarted) {
                        // handleRemoteHangup(userId);
                    }
                    break;
                default:
                    handleRTCMessage(remote, userId, message);
            }
        };


// to send message in a room
const sendMessage =
    (clientState: ClientState, sendSocket: Function) =>
        (message: Message, toUserId?: UserId): void => {
            // console.log('Client sending message: ', message, toRoom, toUserId);
            if (clientState.userId === null) {
                setTimeout(sendMessage, 500,
                    message, clientState.roomName, toUserId);
                return;
            }
            sendSocket('message', clientState.userId, message, clientState.roomName, toUserId);
        };




const handleRTCMessage =
    async (remote: Remote, userId: UserId, message: Message) => {
        const pc = await waitNonNull<RTCPeerConnection>(() => remote.pc);
        switch (message.type) {
            case 'offer':
                if (!remote.isInitiator && !remote.isStarted) {
                    console.log(`starting communication with ${userId} with an offer`);
                    maybeStart(userId);
                }
                await pc.setRemoteDescription(message)
                    .catch(e => console.log(e));
                doAnswer(pc, userId);
                break;
            case 'answer':
                if (remote.isStarted) {
                    pc.setRemoteDescription(message)
                        .catch(e => console.log(e));
                }
                break;
            case 'candidate':
                if (remote.isStarted) {
                    const candidate = new RTCIceCandidate({
                        sdpMLineIndex: message.label,
                        candidate: message.candidate
                    });
                    pc.addIceCandidate(candidate);
                }
                break;
            default:
                throw Error(`received message has unknown type ${message.type}`)
        }
    };



// If found local stream
const callOthers =
    async (clientState: ClientState, sendSocket: Function): Promise<void> => {
        // wait the clientState.userId to be non-null.
        await waitNonNull<string>(() => clientState.userId);
        for (const [userId, remote] of clientState.remotes.entries()) {
            sendMessage(clientState, sendSocket)({ type: 'got user media' }, userId);
            if (remote.isInitiator) {
                maybeStart(userId);
            }
        }
    };

const setStream =
    (clientState: ClientState, localVideo: HTMLVideoElement) =>
        (stream: MediaStream): void => {
            console.log('Adding local stream.');
            clientState.localStream = stream;
            localVideo.srcObject = stream;
        };

const getLocalStream =
    async (clientState: ClientState, localVideo: HTMLVideoElement, sendSocket: Function) =>
        navigator.mediaDevices.getUserMedia(clientState.localStreamConstraints)
            .then(setStream(clientState, localVideo))
            .then(() => callOthers(clientState, sendSocket))
            .catch(e => {
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
    }
}

// Sending bye if user closes the window
window.onbeforeunload = (): void => {
    sendMessage({ type: 'bye' }, roomName);
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
                    .then(() => sendMessage(sessionDescription, roomName, userId));
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
            }, roomName, userId);
        } else {
            console.log('End of candidates.');
        }
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
                    sendMessage(sessionDescription, roomName, userId);
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
