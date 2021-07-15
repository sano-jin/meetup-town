/* サーバとの通信をおこなう
 *
*/

export { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart };
import { turnConfig } from './config';
import { Message } from './../../../../message';
import { UserInfo, UserId } from './../../../../userInfo'; // 
import { json2Map, map2Json } from '../../../../util'
import { Remote } from './clientState'
import { ChatMessage } from './../../../../chatMessage'


type SendMessage = (message: Message) => void;
type AddVideoElement = (remoteStream: MediaStream | null) => void;
type Hangup = () => void;
type ReceiveChat = (chat: ChatMessage) => void;
type UpdateRemote = (f: (oldRemote: Remote) => Remote | undefined) => void;
interface ClientProps {
    sendMessage: SendMessage;
    addVideoElement: AddVideoElement;
    handleRemoteHangup: Hangup;
    hangup: Hangup;
    block: Hangup;
    receiveChat: ReceiveChat;
    updateRemote: UpdateRemote;
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
                    remoteStream: null
                }
            );
        }
        console.log("remotes", map2Json(remotes));
        return remotes;
    };

const getInitRemote = (userInfo: UserInfo) => {
    return {
        userInfo: userInfo,
        isChannelReady: true,
        isInitiator: false,
        isStarted: false,
        pc: null,
        remoteStream: null
    }
};


const handleMessage =
    (remote: Remote, message: Message, localStream: MediaStream | null,
        props: ClientProps): void => {
        switch (message.type) {
            case 'call':
                if (localStream === null) return;
                props.updateRemote(remote => maybeStart(remote, localStream, props));
                break;
            case 'chat':
                props.receiveChat(message.chatMessage);
                break;
            case 'bye':
                console.log("received bye");
                if (remote.isStarted) {
                    props.block();
                    //                    props.handleRemoteHangup();
                }
                break;
            case 'pdfcommand':
                console.log("receive pdfcommand");
                console.log(message.command);
                break;
            default: //webRTCで通信の確立のためにごちゃごちゃやる
                switch (message.type) {
                    case 'offer':
                        props.updateRemote(remote => {
                            let newRemote = remote;
                            if (!remote.isInitiator && localStream !== null) {
                                console.log(`starting communication with an offer`);
                                newRemote = maybeStart(remote, localStream, props);
                            }
                            newRemote.pc!
                                .setRemoteDescription(message)
                                .then(() => {
                                    doAnswer(newRemote.pc!, props.sendMessage);
                                });
                            return newRemote;
                        });
                        break;
                    case 'answer':
                        if (remote.pc === null) {
                            console.log(remote);
                            throw Error(`received an answer but the peer connection is null`);
                        }
                        if (remote.isStarted) {
                            remote.pc.setRemoteDescription(message)
                                .catch(e => console.log(e));
                        }
                        break;
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
                        break;
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
            remote.pc = pc;
            remote.isStarted = true;

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
            const pc = new RTCPeerConnection(turnConfig);
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
        console.log("handleRemoteStream", event);
        if (event.streams.length >= 1) {
            addVideoElement(event.streams[0]);
        } else {
            addVideoElement(null);
        }
    };

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


