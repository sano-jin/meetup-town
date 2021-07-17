////////////////////////////////////////////////////////////////////////////////
//
// サーバとの通信をおこなうモジュール
//
////////////////////////////////////////////////////////////////////////////////


export { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart };

// 共用モジュール
import { json2Map, map2Json }	from '../../../../util'

// 他のユーザの状態，サーバとの通信でやりとりするものの型など
import { turnConfig }		from './config';
import { RemoteUser }		from './clientState'
import { Message }		from './../../../../message';
import { UserInfo, UserId }	from './../../../../userInfo'; // 
import { ChatMessage }		from './../../../../chatMessage'


// Main.tsx において実装される関数などの型
type SendMessage	= (message: Message) => void;
type AddVideoElement	= (remoteStream: MediaStream | null) => void;
type Hangup		= () => void;
type ReceiveChat	= (chat: ChatMessage) => void;
type UpdateRemoteUser	= (f: (oldRemoteUser: RemoteUser) => RemoteUser | undefined) => void;
interface ClientProps {
    sendMessage		: SendMessage;
    addVideoElement	: AddVideoElement;
    handleRemoteUserHangup	: Hangup;
    hangup		: Hangup;
    block		: Hangup;
    receiveChat		: ReceiveChat;
    updateRemoteUser	: UpdateRemoteUser;
};


// 自分が部屋に入ったときに，すでにいた他の人の情報（初期状態）をまとめて返す
// 特に通信をするわけではない，純粋なコンビネータ
// 通信するわけではないので，clientState.ts に移した方が良いかも
const getInitRemoteUsers =
    (jsonStrOtherUsers: string): Map<UserId, RemoteUser> => {
        const otherUsers: Map<UserId, UserInfo> = json2Map(jsonStrOtherUsers);
        console.log(otherUsers);

        const remoteUsers = new Map<UserId, RemoteUser>();
        for (const [userId, userInfo] of otherUsers) {
            remoteUsers.set(
                userId,
                {
                    userInfo		: userInfo,
                    isChannelReady	: true,
                    amIInitiator	: true,
                    isStarted		: false,
                    pc			: null,
                    remoteStream	: null
                }
            );
        }
        console.log("remoteUsers", map2Json(remoteUsers));
        return remoteUsers;
    };


// 他の人が部屋に入ってきたときに，その人の初期状態を返す
// 特に通信をするわけではない，純粋なコンビネータ
// 通信するわけではないので，clientState.ts に移した方が良いかも
const getInitRemoteUser = (userInfo: UserInfo) => {
    return {
        userInfo	: userInfo,
        isChannelReady	: true,
        amIInitiator	: false,
        isStarted	: false,
        pc		: null,
        remoteStream	: null
    }
};


// サーバからメッセージが来たときに，処理を行う
const handleMessage =
    (remoteUser: RemoteUser, message: Message, localStream: MediaStream | null, props: ClientProps): void => {
        switch (message.type) {
            case 'call': // ビデオ通話のお誘い
                if (localStream === null) return;
		// 不安要素：自分が Initiator かどうかの確認はしなくて良いのか？
                props.updateRemoteUser(remoteUser => maybeStart(remoteUser, localStream, props));
                break;
            case 'chat': // チャットメッセージの受信
                props.receiveChat(message.chatMessage);
                break;
            case 'bye': // ビデオ通話を切られた
                console.log("received bye");
                if (remoteUser.isStarted) {
                    props.block();
                    //                    props.handleRemoteUserHangup();
                }
                break;
            case 'pdfcommand':
                console.log("receive pdfcommand");
                console.log(message.command);
                break;
            default: // webRTC で通信の確立のためにごちゃごちゃやる
		handleWebRTCMessage(remoteUser, message, localStream, props);
	}
    };



////////////////////////////////////////////////////////////////////////////////
//
// 以下は WebRTC を用いたリアルタイム通信のための API の処理
//
////////////////////////////////////////////////////////////////////////////////



// webRTC で通信の確立のためにごちゃごちゃやる
const handleWebRTCMessage =
    (remoteUser: RemoteUser, message: Message, localStream: MediaStream | null, props: ClientProps): void => {
        switch (message.type) {
            case 'offer':
                props.updateRemoteUser(remoteUser => {
                    let newRemoteUser = remoteUser;
                    if (!remoteUser.amIInitiator && localStream !== null) {
                        console.log(`starting communication with an offer`);
                        newRemoteUser = maybeStart(remoteUser, localStream, props);
                    }
                    newRemoteUser.pc!
                        .setRemoteDescription(message)
                        .then(() => {
                            doAnswer(newRemoteUser.pc!, props.sendMessage);
                        });
                    return newRemoteUser;
                });
                break;
            case 'answer':
                if (remoteUser.pc === null) {
                    console.log(remoteUser);
                    throw Error(`received an answer but the peer connection is null`);
                }
                if (remoteUser.isStarted) {
                    remoteUser.pc.setRemoteDescription(message)
                        .catch(e => console.log(e));
                }
                break;
            case 'candidate':
                if (remoteUser.pc === null) {
                    throw Error(`received a candidate but the peer connection is null`);
                }
                if (remoteUser.isStarted) {
                    const candidate = new RTCIceCandidate({
                        sdpMLineIndex: message.label,
                        candidate: message.candidate
                    });
                    remoteUser.pc.addIceCandidate(candidate);
                }
                break;
            default:
                throw Error(`received message has unknown type ${message.type}`)
        }
    };



// If initiator, create the peer connection
const maybeStart =
    (remoteUser: RemoteUser, localStream: MediaStream, props: ClientProps): RemoteUser => {
        console.log(
            '>>>>>>> maybeStart() ',
            remoteUser.isStarted,
            localStream,
            remoteUser.isChannelReady
        );
        if (!remoteUser.isStarted && remoteUser.isChannelReady) {
            console.log('>>>>>> creating peer connection');
            const pc = createPeerConnection(remoteUser, props);
            localStream
                .getTracks()
                .forEach(track => pc.addTrack(track, localStream));
            remoteUser.pc = pc;
            remoteUser.isStarted = true;

            return { ...remoteUser, pc: pc, isStarted: true };
        } else return remoteUser;
    }

/*
window.onbeforeunload = (e: Event): void => {
    e.preventDefault();
    e.returnValue = false;
    for (const [userId, _] of clientState.remoteUsers.entries()) {
        sendMessage({ type: 'bye' }, userId);
    }
};
*/

// Creating peer connection
const createPeerConnection =
    (remoteUser: RemoteUser, props: ClientProps): RTCPeerConnection => {
        try {
            const pc = new RTCPeerConnection(turnConfig);
            pc.onicecandidate = handleIceCandidate(props.sendMessage);
            pc.ontrack = handleRemoteUserStream(props.addVideoElement);
            pc.onnegotiationneeded = handleNegotiationNeededEvent(pc, remoteUser, props.sendMessage);
            pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent(pc, props);
            pc.onsignalingstatechange = handleSignalingStateChangeEvent(pc, props);
            // pc.onremovestream = handleRemoteUserStreamRemoved; // deprecated
            console.log('Created RTCPeerConnnection');
            return pc;
        } catch (e) {
            console.log(`Failed to create PeerConnection, exception: ${e.message}`);
            throw Error('Cannot create RTCPeerConnection object.');
        }
    }

const handleNegotiationNeededEvent =
    (pc: RTCPeerConnection, remoteUser: RemoteUser, sendMessage: SendMessage) => () => {
        console.log(`handleNegotiationNeededEvent`, remoteUser);
        pc.createOffer()
            .then((sessionDescription) => {
                if (remoteUser.amIInitiator) {
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


const handleRemoteUserStream =
    (addVideoElement: AddVideoElement) => (event: RTCTrackEvent): void => {
        console.log("handleRemoteUserStream", event);
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
                    props.handleRemoteUserHangup();
                    break;
            }
        };

const handleSignalingStateChangeEvent =
    (pc: RTCPeerConnection, props: ClientProps) =>
        (_: Event) => {
            switch (pc.signalingState) {
                case "closed":
                    props.handleRemoteUserHangup();
                    break;
            }
        };


