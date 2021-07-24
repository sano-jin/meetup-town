////////////////////////////////////////////////////////////////////////////////
//
// サーバとの通信をおこなうモジュール
//
////////////////////////////////////////////////////////////////////////////////


export { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart };

// 共用モジュール
import { json2Map, map2Json }	from '../../../../util'

// 他のユーザの状態，サーバとの通信でやりとりするものの型など
import { turnConfig }		from './config';
import { Remote }		from './clientState'
import { Message }		from './../../../../message';
import { UserInfo, UserId }	from './../../../../userInfo'; // 
import { ChatMessage }		from './../../../../chatMessage'


// Main.tsx において実装される関数などの型
type SendMessage	= (message: Message) => void;
type AddVideoElement	= (remoteStream: MediaStream | null) => void;
type Hangup		= () => void;
type ReceiveChat	= (chat: ChatMessage) => void;
type UpdateRemote	= (f: (oldRemote: Remote) => Remote | undefined) => void;
interface ClientProps {
    sendMessage		: SendMessage;
    addVideoElement	: AddVideoElement;
    handleRemoteHangup	: Hangup;
    hangup		: Hangup;
    block		: Hangup;
    receiveChat		: ReceiveChat;
    updateRemote	: UpdateRemote;
};


// 自分が部屋に入ったときに，すでにいた他の人の情報（初期状態）をまとめて返す
// 特に通信をするわけではない，純粋なコンビネータ
// 通信するわけではないので，clientState.ts に移した方が良いかも
const getInitRemotes =
    (jsonStrOtherUsers: string): Map<UserId, Remote> => {
        const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);
        console.log(otherUsers);

        const remotes = new Map<UserId, Remote>();
        for (const [userId, userInfo] of otherUsers) {
            remotes.set(
                userId,
                {
                    userInfo		: userInfo,
                    isChannelReady	: true,
                    isInitiator		: true,
                    isStarted		: false,
                    pc			: null,
                    remoteStream	: null
                }
            );
        }
        console.log("remotes", map2Json(remotes));
        return remotes;
    };


// 他の人が部屋に入ってきたときに，その人の初期状態を返す
// 特に通信をするわけではない，純粋なコンビネータ
// 通信するわけではないので，clientState.ts に移した方が良いかも
const getInitRemote = (userInfo: UserInfo) => {
    return {
        userInfo	: userInfo,
        isChannelReady	: true,
        isInitiator	: false,
        isStarted	: false,
        pc		: null,
        remoteStream	: null
    }
};


// サーバからメッセージが来たときに，処理を行う
const handleMessage =
    (remote: Remote, message: Message, localStream: MediaStream | null, props: ClientProps): void => {
        switch (message.type) {
            case 'call': // ビデオ通話のお誘い
                if (localStream === null) return;
		// 不安要素：自分が Initiator かどうかの確認はしなくて良いのか？
                props.updateRemote(remote => maybeStart(remote, localStream, props));
                break;
            case 'chat': // チャットメッセージの受信
                props.receiveChat(message.chatMessage);
                break;
            case 'bye': // ビデオ通話を切られた
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
            default: // webRTC で通信の確立のためにごちゃごちゃやる
		handleWebRTCMessage(remote, message, localStream, props);
	}
    };



////////////////////////////////////////////////////////////////////////////////
//
// 以下は WebRTC を用いたリアルタイム通信のための API の処理
//
////////////////////////////////////////////////////////////////////////////////



// webRTC で通信の確立のためにごちゃごちゃやる
const handleWebRTCMessage =
    (remote: Remote, message: Message, localStream: MediaStream | null, props: ClientProps): void => {
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


