export { hangup };
import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';
import { UserInfo, UserId } from './userInfo';
import { json2Map, map2Json, getStringFromUser, getTimeString } from '../../src/util'
import { ClientState, Remote } from './clientState'
import { ChatMessage } from './chatMessage'

// Initialize turn/stun server here
const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;
const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;
const chatBoard = document.querySelector<HTMLDivElement>('#chatBoard')!;
const textbox = document.querySelector<HTMLTextAreaElement>("#input-message")!;
const sendButton = document.querySelector<HTMLButtonElement>("#send-button")!;

// Initializing socket.io
const socket = io();

// Prompting for room name:
const roomName: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');

// Defining some global utility variables
const clientState: ClientState = {
    userId: null,
    userInfo: { userName: userName },
    localStream: null,
    remotes: new Map<UserId, Remote>(),
    localStreamConstraints: {
        audio: true,
        video: true
    },
    chats: [],
}

socket.emit('join', roomName, { userName: userName });
console.log('Attempted to create or join room', roomName);

socket.on('joined', (roomName: string, userId: UserId, jsonStrOtherUsers: string): void => {
    console.log(`me joined to the room ${roomName}`, jsonStrOtherUsers);
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
                remoteStream: null,
                remoteVideoElement: null
            }
        );
    }
    console.log("remotes", map2Json(clientState.remotes));
});

socket.on('anotherJoin', (roomName: string, userId: UserId, userInfo: UserInfo): void => {
    console.log(`Another user ${userId} has joined to our room ${roomName}`);
    clientState.remotes.set(
        userId,
        {
            userInfo: userInfo,
            isChannelReady: true,
            isInitiator: false,
            isStarted: false,
            pc: null,
            remoteStream: null,
            remoteVideoElement: null
        }
    );
    console.log("remotes", map2Json(clientState.remotes));
});


// Driver code
socket.on('message', (userId: UserId, message: Message, roomName: string) => {
    if (message.type !== 'candidate') {
        console.log('Received message:', message, `from user ${userId} in room ${roomName}`);
    }
    if (!clientState.remotes.has(userId)) {
        throw Error(`remote is null for ${userId}`);
    }
    const remote: Remote = clientState.remotes.get(userId)!;
    switch (message.type) {
        case 'call':
            maybeStart(userId);
            break;
        case 'chat':
            clientState.chats.push(message.chatMessage);
            addChatMessage(message.chatMessage);
            break;
        case 'bye':
            console.log("received bye");
            if (remote.isStarted) {
                handleRemoteHangup(userId);
            }
            break;
        default:
            if (remote.pc === null) {
                throw Error(`received an offer/answer/candidate but the peer connection is null`);
            }
            switch (message.type) {
                case 'offer':
                    if (!remote.isInitiator && !remote.isStarted) {
                        console.log(`starting communication with ${userId} with an offer`);
                        maybeStart(userId);
                    }
                    remote.pc
                        .setRemoteDescription(message)
                        .then(() => {
                            if (remote.pc !== null) {
                                doAnswer(remote.pc, userId);
                            } else throw Error(`remote.pc is null for user ${userId}`)
                        })
                        .catch(e => console.log(e));
                    break;
                case 'answer':
                    if (remote.isStarted) {
                        remote.pc.setRemoteDescription(message)
                            .catch(e => console.log(e));
                    }
                    break;
                case 'candidate':
                    if (remote.isStarted) {
                        const candidate = new RTCIceCandidate({
                            sdpMLineIndex: message.label,
                            candidate: message.candidate
                        });
                        remote.pc.addIceCandidate(candidate);
                    }
                    break;
                default:
                    throw Error(`received message has unknown type ${message.type}`)
            }
    }
});

// to send message in a room
const sendMessage = (message: Message, toUserId?: UserId): void => {
    // console.log('Client sending message: ', message, toRoom, toUserId);
    if (clientState.userId === null) {
        setTimeout(sendMessage, 500, message, toUserId);
        return;
    }
    socket.emit('message', clientState.userId, message, roomName, toUserId);
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
            sendMessage({ type: 'call' }, userId);
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
    }
}

window.onbeforeunload = (e: Event): void => {
    e.preventDefault();
    e.returnValue = false;
    for (const [userId, _] of clientState.remotes.entries()) {
        sendMessage({ type: 'bye' }, userId);
    }
};


// Creating peer connection
const createPeerConnection =
    (userId: UserId): RTCPeerConnection | null => {
        try {
            const pc = new RTCPeerConnection(pcConfig);
            pc.onicecandidate = handleIceCandidate(userId);
            pc.ontrack = handleRemoteStream(userId);
            pc.onnegotiationneeded = handleNegotiationNeededEvent(pc, userId);
            pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent(pc, userId);
            pc.onsignalingstatechange = handleSignalingStateChangeEvent(pc, userId);
            // pc.onremovestream = handleRemoteStreamRemoved; // deprecated
            console.log('Created RTCPeerConnnection');
            return pc;
        } catch (e) {
            console.log(`Failed to create PeerConnection, exception: ${e.message}`);
            alert('Cannot create RTCPeerConnection object.');
            return null;
        }
    }

const handleNegotiationNeededEvent =
    (pc: RTCPeerConnection, userId: UserId) => () => {
        console.log(`handleNegotiationNeededEvent`, userId);
        pc.createOffer()
            .then((sessionDescription) => {
                if (clientState.remotes.get(userId)!.isInitiator) {
                    setLocalAndSendMessage(pc, userId)(sessionDescription);
                }
            })
            .catch(e => console.log(e));
    }

// to handle Ice candidates
const handleIceCandidate =
    (userId: UserId) => (event: RTCPeerConnectionIceEvent): void => {
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            }, userId);
        } else {
            console.log('End of candidates.');
        }
    }

const doAnswer = (pc: RTCPeerConnection, userId: UserId): void => {
    console.log(`Sending answer to peer ${userId}`);
    pc.createAnswer()
        .then(setLocalAndSendMessage(pc, userId))
        .catch((error) => console.trace(`Failed to create session description: ${error.toString()}`));
}

const setLocalAndSendMessage =
    (pc: RTCPeerConnection, userId: UserId) =>
        (sessionDescription: RTCSessionDescriptionInit): void => {
            pc.setLocalDescription(sessionDescription)
                .then(() => {
                    console.log(`setLocalAndSendMessage sending message to ${userId}`,
                        sessionDescription);
                    sendMessage(sessionDescription, userId);
                })
                .catch(e => console.log(e));
        }


const handleRemoteStream = (userId: string) => (event: RTCTrackEvent): void => {
    const remote = clientState.remotes.get(userId)!;
    if (event.streams.length >= 1) {
        console.log(`Remote stream of userId ${userId} added.`);
        const remoteStream = event.streams[0];
        if (remote.remoteStream === null) {
            remote.remoteStream = remoteStream;
            const item = addVideoElement(userId, remoteStream);
            remote.remoteVideoElement = item;
            remoteVideos.appendChild(item);
        }
    } else {
        console.log(`Remote stream of userId ${userId} removed.`);
        remote.remoteStream = null;
        remote.remoteVideoElement!.remove(); // Removal from DOM
    }
    console.log("clientState.remotes", clientState.remotes);
}

const addVideoElement =
    (toUserId: UserId, remoteStream: MediaStream): HTMLLIElement => {
        console.log(`adding ${toUserId} of ${remoteStream!.id}`);
        const item = document.createElement("li");
        item.className = `remote_div username_${toUserId}`;
        const videoElement = document.createElement("video")
        videoElement.srcObject = remoteStream;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        item.appendChild(videoElement);
        return item;
    }

const hangup = (toUserId: UserId): void => {
    console.log('Hanging up.');
    const remote = clientState.remotes.get(toUserId);
    if (remote === undefined || remote === null) {
        throw Error(`trying to hanging up the unknown user ${toUserId}`);
    }
    stop(remote);
    sendMessage({ type: 'bye' }, toUserId);

    remote.remoteStream = null;

}

const handleRemoteHangup = (toUserId: UserId): void => {
    console.log('Session terminated.');
    const remote = clientState.remotes.get(toUserId)!;
    stop(remote);
    remote.isInitiator = false;
    remote.remoteVideoElement!.remove(); // hide remote video
    clientState.remotes.delete(toUserId);
}

const stop = (remote: Remote): void => {
    remote.isStarted = false;
    remote.pc!.close();
    remote.pc = null;
}



const handleICEConnectionStateChangeEvent =
    (pc: RTCPeerConnection, userId: UserId) =>
        (_: Event) => {
            switch (pc.iceConnectionState) {
                case "closed":
                case "failed":
                    handleRemoteHangup(userId);
                    break;
            }
        };

const handleSignalingStateChangeEvent =
    (pc: RTCPeerConnection, userId: UserId) =>
        (_: Event) => {
            switch (pc.signalingState) {
                case "closed":
                    handleRemoteHangup(userId);
                    break;
            }
        };

const createElement = (tagName: string, className: string, content: string): HTMLElement => {
    const item = document.createElement(tagName);
    item.className = className;
    item.textContent = content;
    return item;
}

const getChatMessageElement =
    (fromUser: string, time: string, content: string): HTMLElement => {
        const messageItem = createElement("div", `chat-message-item`, content);
        const userNameItem =
            createElement("span", `chat-userName-item`, fromUser);
        const dateItem = createElement("span", `chat-date-item`, time);
        const userNameDateContainer = createElement("div", `chat-userName-date-container`, "")
        userNameDateContainer.appendChild(userNameItem);
        userNameDateContainer.appendChild(dateItem);
        const chatContainer = createElement("div", `chat-item`, "");
        chatContainer.appendChild(userNameDateContainer);
        chatContainer.appendChild(messageItem);
        return chatContainer;
    }

const addChatMessage =
    (chatMessage: ChatMessage): void => {
        console.log(`adding ${chatMessage}`);
        chatBoard.appendChild(getChatMessageElement(
            clientState.remotes.get(chatMessage.fromUser)!.userInfo.userName,
            chatMessage.time,
            chatMessage.message
        ));
        const parent: HTMLElement = chatBoard.parentElement!;
        parent.scrollTop = parent.scrollHeight;
    };

const sendChatMessage = (_: MouseEvent): void => {
    console.log(`sendChatMessage`);
    const inputValue = textbox.value;
    textbox.value = "";
    if (inputValue === "") return;
    const chatMessage = {
        fromUser: clientState.userId!,
        time: getTimeString(),
        message: inputValue,
    };
    sendMessage({ type: "chat", chatMessage: chatMessage });
    const chatMessageElement = getChatMessageElement(
        clientState.userInfo.userName,
        chatMessage.time,
        chatMessage.message
    );
    chatMessageElement.className += " my-message";
    chatBoard.appendChild(chatMessageElement);
};

sendButton.onclick = sendChatMessage;
