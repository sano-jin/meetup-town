export { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart };
// import io from "socket.io-client";
import { turnConfig } from './config';
import { Message } from './message';
import { UserInfo, UserId } from './userInfo'; // 
import { json2Map, map2Json, getTimeString } from '../../src/util'
import { Remote } from './clientState'
import { ChatMessage } from './chatMessage'
// import { chatBoard } from "./../components/chatMessage";
import {
    textbox,
    sendButton
} from './../pages/user'


// Initialize turn/stun server here
const pcConfig = turnConfig;

type SendMessage = (message: Message) => Promise<void>;
type AddVideoElement = (remoteStream: MediaStream | null) => Promise<void>;
type HandleRemoteHangup = () => Promise<void>;
type Hangup = () => Promise<void>;
type ClientProps = {
    sendMessage: SendMessage,
    addVideoElement: AddVideoElement,
    handleRemoteHangup: HandleRemoteHangup,
    hangup: Hangup,
};


const getInitRemotes =
    (jsonStrOtherUsers: string): Map<UserId, Remote> => {
        const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);
        console.log(otherUsers);

        const remotes = new Map<UserId, Remote>();
        for (const [userId, userInfo] of otherUsers) {
            remotes.set(
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
        return remotes;
    };

const getInitRemote = (userInfo: UserInfo) => {
    return {
        userInfo: userInfo,
        isChannelReady: true,
        isInitiator: false,
        isStarted: false,
        pc: null,
        remoteStream: null,
        remoteVideoElement: null
    }
};


const handleMessage =
    (remote: Remote, message: Message, localStream: MediaStream | null,
        props: ClientProps): [Remote?, ChatMessage?] => {
        switch (message.type) {
            case 'call':
                if (localStream === null) return [remote, undefined];
                return [maybeStart(remote, localStream, props), undefined];
            case 'chat':
                return [remote, message.chatMessage];
            /*
              clientState.chats.push(message.chatMessage);
              addChatMessage(message.chatMessage);
            */
            case 'bye':
                console.log("received bye");
                if (remote.isStarted) {
                    props.handleRemoteHangup();
                }
                return [undefined, undefined];
            default:
                switch (message.type) {
                    case 'offer':
                        let newRemote = remote;
                        if (!remote.isInitiator && localStream !== null) {
                            console.log(`starting communication with an offer`);
                            newRemote = maybeStart(remote, localStream, props);
                        }
                        newRemote.pc!
                            .setRemoteDescription(message)
                            .then(() => {
                                if (remote.pc !== null) {
                                    doAnswer(remote.pc, props.sendMessage);
                                } else throw Error(`remote.pc is null`)
                            })
                            .catch(e => console.log(e));
                        return [newRemote, undefined];
                    case 'answer':
                        if (remote.pc === null) {
                            throw Error(`received an answer but the peer connection is null`);
                        }
                        if (remote.isStarted) {
                            remote.pc.setRemoteDescription(message)
                                .catch(e => console.log(e));
                        }
                        return [remote, undefined];
                    case 'candidate':
                        if (remote.pc === null) {
                            throw Error(`received a candidate but the peer connection is null`);
                        }
                        if (remote.isStarted) {
                            const candidate = new RTCIceCandidate({
                                sdpMLineIndex: message.label,
                                candidate: message.candidate
                            });
                            remote.pc.addIceCandidate(candidate);
                        }
                        return [remote, undefined];
                    default:
                        throw Error(`received message has unknown type ${message.type}`)
                }
        }
    };

// If initiator, create the peer connection
const maybeStart =
    (remote: Remote, localStream: MediaStream, props: ClientProps): Remote => {
        console.log(
            '>>>>>>> maybeStart() ',
            remote.isStarted,
            localStream,
            remote.isChannelReady
        );
        if (!remote.isStarted && remote.isChannelReady) {
            console.log('>>>>>> creating peer connection');
            const pc = createPeerConnection(remote, props);
            localStream
                .getTracks()
                .forEach(track => pc.addTrack(track, localStream));

            return { ...remote, pc: pc, isStarted: true };
        } else return remote;
    }

/*
window.onbeforeunload = (e: Event): void => {
    e.preventDefault();
    e.returnValue = false;
    for (const [userId, _] of clientState.remotes.entries()) {
        sendMessage({ type: 'bye' }, userId);
    }
};
*/

// Creating peer connection
const createPeerConnection =
    (remote: Remote, props: ClientProps): RTCPeerConnection => {
        try {
            const pc = new RTCPeerConnection(pcConfig);
            pc.onicecandidate = handleIceCandidate(props.sendMessage);
            pc.ontrack = handleRemoteStream(props.addVideoElement);
            pc.onnegotiationneeded = handleNegotiationNeededEvent(pc, remote, props.sendMessage);
            pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent(pc, props);
            pc.onsignalingstatechange = handleSignalingStateChangeEvent(pc, props);
            // pc.onremovestream = handleRemoteStreamRemoved; // deprecated
            console.log('Created RTCPeerConnnection');
            return pc;
        } catch (e) {
            console.log(`Failed to create PeerConnection, exception: ${e.message}`);
            throw Error('Cannot create RTCPeerConnection object.');
        }
    }

const handleNegotiationNeededEvent =
    (pc: RTCPeerConnection, remote: Remote, sendMessage: SendMessage) => () => {
        console.log(`handleNegotiationNeededEvent`, remote);
        pc.createOffer()
            .then((sessionDescription) => {
                if (remote.isInitiator) {
                    setLocalAndSendMessage(pc, sendMessage)(sessionDescription);
                }
            })
            .catch(e => console.log(e));
    }

// to handle Ice candidates
const handleIceCandidate =
    (sendMessage: SendMessage) => (event: RTCPeerConnectionIceEvent): void => {
        if (event.candidate) {
            sendMessage({
                type: 'candidate',
                label: event.candidate.sdpMLineIndex,
                id: event.candidate.sdpMid,
                candidate: event.candidate.candidate
            });
        } else {
            console.log('End of candidates.');
        }
    }

const doAnswer = (pc: RTCPeerConnection, sendMessage: SendMessage): void => {
    console.log(`Sending answer to peer`);
    pc.createAnswer()
        .then(setLocalAndSendMessage(pc, sendMessage))
        .catch(error => console.trace(`Failed to create session description: ${error.toString()}`));
};

const setLocalAndSendMessage =
    (pc: RTCPeerConnection, sendMessage: SendMessage) =>
        (sessionDescription: RTCSessionDescriptionInit): void => {
            pc.setLocalDescription(sessionDescription)
                .then(() => {
                    console.log("sending sessionDescription", sessionDescription);
                    sendMessage(sessionDescription);
                })
                .catch(e => console.log(e));
        };


const handleRemoteStream =
    (addVideoElement: AddVideoElement) => (event: RTCTrackEvent): void => {
        if (event.streams.length >= 1) {
            addVideoElement(event.streams[0]);
        } else {
            addVideoElement(null);
        }
    };

/*
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
*/


/*
const hangup = (remote: Remote, sendMessage: SendMessage): void => {
    console.log('Hanging up.');
    if (remote === undefined || remote === null) {
        throw Error(`trying to hanging up the unknown user ${toUserId}`);
    }
    stop(remote);
    sendMessage({ type: 'bye' });

    remote.remoteStream = null;

}

const handleRemoteHangup = (props: ClientProps): void => {
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

*/

const handleICEConnectionStateChangeEvent =
    (pc: RTCPeerConnection, props: ClientProps) =>
        (_: Event) => {
            switch (pc.iceConnectionState) {
                case "closed":
                case "failed":
                    props.handleRemoteHangup();
                    break;
            }
        };

const handleSignalingStateChangeEvent =
    (pc: RTCPeerConnection, props: ClientProps) =>
        (_: Event) => {
            switch (pc.signalingState) {
                case "closed":
                    props.handleRemoteHangup();
                    break;
            }
        };

/*
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

        chatBoard.addChatMessage(chatMessage);


 //       chatBoard.appendChild(getChatMessageElement(
 //           clientState.remotes.get(chatMessage.userId)!.userInfo.userName,
 //           chatMessage.time,
 //           chatMessage.message
 //       ));
 //       const parent: HTMLElement = chatBoard.parentElement!;
 //       parent.scrollTop = parent.scrollHeight;

    };

*/



