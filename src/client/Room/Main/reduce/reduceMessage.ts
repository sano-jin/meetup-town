////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態を更新するための関数群
// - **サーバを介するメッセージの受信** による
//   **アプリのコアな部分** の状態遷移を実行するためのモジュール
// - 実装する機能
//   - チャットメッセージの送受信や PDF の送受信などのアプリケーション的な機能の実装
//   - WebRTC の offer/answer/candidate の処理など
//
////////////////////////////////////////////////////////////////////////////////


// ファイル分割したほうが良さそう

// - Elm Architecture でいうところの update, command
// - Redux などで置き換えたい気分
//
// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


export {
    updateWithMessage,		// サーバからメッセージを受信した場合
};


// サーバとの通信
// import { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart } from "./ts/client";
import { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart } from "./ts/client";
import io from "socket.io-client";

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, RemoteUser, StreamConstraints }	from "./ts/clientState";
import { Message }		from './../../../message';
import { ChatMessage }		from './../../../chatMessage';
import { UserInfo, UserId }	from './../../../userInfo';
import { PDFCommandType }	from './../../../PDFCommandType';




// toUserId にメッセージを送る関数の型
type DispatchSendMessageTo = (toUserId: UserId | undefined) => (message: Message) => void;

// 特定のユーザ（既に固定済み）にメッセージを送る関数の型
type DispatchSendMessage = (message: Message) => void;

// WebRTC 関連の動作をする際に，React の状態を更新しなくてはいけない時は，この関数を実行する
// `() =>` が余計についているのは，すぐにこの関数を実行したいとは限らないため
// - むしろ，WebRTC のイベントにバインドすることがほとんど（イベントが発火した時に初めて呼ばれる）
type DispatchUpdateWithRTC = (updateWithRTC: (state: ClientState) => ClientState) => () => void;





////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// サーバからメッセージを受信した時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////


// サーバからメッセージを受信した時に呼ばれる関数
// 新しい状態を返す（それに基づいて，呼び出し元で状態の更新を行う）
const updateWithMessage =
    ( userId: UserId, message: Message
      , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC) =>
    (state: ClientState): ClientState => {
	// 受信したメッセージを，一応，デバッグ用に表示する
	if (message.type !== 'candidate') {
	    // candidate は回数が多いので，それ以外ならデバッグ用に表示ということにする
	    console.log('Received message:', message, `from user ${userId}`);
	}

	const remoteUser: RemoteUser | undefined = state.remoteUsers.get(userId); // remoteUser を取得
	if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
	    throw Error(`remoteUser is undefined for ${userId}`);
	}

	// return handleMessageFrom(remoteUser, message, this.state.localStream, props(userId));

	// メッセージの種類に応じて分岐する
        switch (message.type) { // まずはアプリケーションメッセージの受信を行う
	    case 'chat': // チャットメッセージの受信 
		return {...state, chats: [...state.chats, message.chatMessage]};

	    case 'pdfcommand': // PDF の共有に関するメッセージの受信
                console.log("receive pdfcommand");
                console.log(message.command);
                return state; // TODO: 実装

	    default: // アプリのコアな部分に関するメッセージの受信を行う
		return updateWithKernelMessage(userId, remoteUser, message
					       , dispatchSendMessage, dispatchUpdateWithRTC
					       , state);
	}
    };






////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// サーバからアプリのコアな部分に関するメッセージを受信した時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////


// サーバからアプリのコアな部分に関するメッセージを受信した時に呼ばれる関数
// 新しい状態を返す（それに基づいて，呼び出し元で状態の更新を行う）
const updateWithKernelMessage =
    ( userId: UserId, remoteUser, RemoteUser, message: Message
      , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC
      , state: ClientState): ClientState => {

	// メッセージの種類に応じて分岐する
        switch (message.type) { // まずはアプリケーションメッセージの受信を行う
	    case 'bye': // ビデオ通話を切られた・部屋を出た
		// 現状は部屋にいる間はずっとビデオをオンにしている前提だが，
		// オン・オフ切り替えられるようにするのであれば，
		// 上記は区別する必要がある
                if (remoteUser.isStarted) {
 		    remoteUser.pc?.close(); // RTC PeerConnection を閉じる
		}
		return {...state // userId のユーザを削除する
			, remoteUsers: new Map([...state.remoteUsers].filter(([uid, _] => uid !== userId)))};

	    case 'call': // ビデオ通話のお誘い
                if (state.localStream === null) { // 自分のカメラ映像を取得できていなかったら
		    // 自分のカメラ映像を取得し，取得できたら相手へ offer をする
		    dispatchLocalMedia(state.localStreamConstraints, dispatchSendMessage, dispatchUpdateWithRTC);
		} else {
		    // 自分のカメラ映像を取得できているなら RTCPeerConnection の設立を試みる
		    maybeStart(remoteUser, state.localStream, dispatchSendMessage, dispatchUpdateWithRTC);
		}
		
		// とりあえずは，状態の更新はしないで戻しておく
		// あとで dispatchUpdateWithRTC を使ってさっき実行した関数（が bind するイベント）が
		// 状態の更新をしてくれるので
		return state;

	    default: // webRTC で通信の確立のためにごちゃごちゃやる
		dispatchWithRTCMessage(remoteUser, message, dispatchSendMessage, dispatchUpdateWithRTC, state);
		return state; // とりあえずは，状態の更新はしないで戻しておく
	}
    });



////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// 以下は WebRTC を用いたリアルタイム通信のための API の処理
//
////////////////////////////////////////////////////////////////////////////////



// webRTC で通信の確立のためにごちゃごちゃやる
const handleWebRTCMessage =
    ( remoteUser, RemoteUser, message: Message
      , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC
      , state: ClientState): ClientState => {
        switch (message.type) {
            case 'offer': // WebRTC の offer
		if (state.localStream === null) { // 自分のカメラ映像を取得できていなかったら
		    // 自分のカメラ映像を取得し，取得できたら相手へ call して，もう一度 offer してもらう
		    dispatchLocalMedia(state.localStreamConstraints, dispatchSendMessage, dispatchUpdateWithRTC);
		} else {
		    // 自分のカメラ映像を取得できているなら RTCPeerConnection の設立を試みる
                    console.log(`starting communication with an offer`);
		    maybeStart(remoteUser, state.localStream, dispatchSendMessage, dispatchUpdateWithRTC)
			.pc?
			.setRemoteDescription(message)
			.then(() => doAnswer(newRemoteUser.pc!, props.sendMessage));
                }
                return;

            case 'answer': // WebRTC の answer
                if (remoteUser.pc === null) {
                    throw Error(`received an answer but the peer connection is null`, remoteUser);
                }
                if (remoteUser.isStarted) {
                    remoteUser.pc.setRemoteDescription(message)
                        .catch(e => console.log(e));
                }
                return;

            case 'candidate':
                if (remoteUser.pc === null) {
                    throw Error(`received a candidate but the peer connection is null`, remoteUser);
                }
                if (remoteUser.isStarted) {
                    const candidate = new RTCIceCandidate({
                        sdpMLineIndex: message.label,
                        candidate: message.candidate
                    });
                    remoteUser.pc.addIceCandidate(candidate);
                }
                return;

            default:
                throw Error(`received message has unknown type ${message.type}`)
        }
    };



////////////////////////////////////////////////////////////////////////////////

// 以上がメッセージによる分岐


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
        pc.createOffer() // Creates an offer
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






// ////////////////////////////////////////////////////////////////////////////////
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// //
// // アプリケーションメッセージの送信
// //
// /////////////////////////////////////////////////////////////////////////////////
// 
// 
// 
// // チャットメッセージを送信する
// const sendChatMessage = (message: string) => {
//     this.setState(state => {
//         console.log("this.state", state);
//         const chatMessage: ChatMessage = { // チャットメッセージ
//             userId: state.userId ?? "undefined",
// 					   time: getTimeString(),
// 					   message: message,
//         };
//         this.sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage }); // チャットを送信
//         return { ...state, chats: [...state.chats, chatMessage]}; // 自分のところにも追加しておく
//     });
// };
// 
// const sendPDFCommand = (com: PDFCommandType) => {
//     const message: Message = {type: "pdfcommand", command: com};
//     this.sendMessageTo(undefined)(message);
// }
// 
// 
// 
// 
// 
// 
// 
// 
// 
// // サーバとのやりとりに必要な関数を渡すための下準備
// // userId を受け取り，そのユーザへの対応を定義する関数のレコードを返す
// const props = (userId: UserId): ClientProps => {
//     
//     const sendMessage = this.sendMessageTo(userId);
// 
//     const updateRemoteUser = (f: (oldRemoteUser: RemoteUser) => RemoteUser | undefined) => {
//         this.setState((oldState: ClientState) => {
//             const oldRemoteUser = oldState.remoteUsers.get(userId);
//             if (oldRemoteUser === undefined) return oldState;
//             const newRemoteUser = f(oldRemoteUser);
//             if (newRemoteUser === undefined) {
//                 return {
//                     ...oldState,
//                     remoteUsers: new Map([...oldState.remoteUsers]
// 					 .filter(([id, _]) => id !== userId)
// 					)
//                 };
//             } else { 
//                 return {...oldState, remoteUsers: new Map([...oldState.remoteUsers, [userId, newRemoteUser]])};
//             }
//         });
//     };
// 
//     const addVideoElement =
//         (remoteUserStream: MediaStream | null) => {
//             updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream}; });
//         };
// 
// 
//     const hangup = () => {
//         console.log('Hanging up.');
//         stopVideo();
//         sendMessage({ type: 'bye' });
//     };
// 
//     const handleRemoteUserHangup = (): void => {
//         stopVideo();
//     };
// 
//     const stopVideo = (): void => {
//         updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream: null, isStarted: false }});
//         
//         // remoteUser.isStarted = false;
//         // remoteUser.pc!.close();
//         // remoteUser.pc = null;
//     };
// 
//     const receiveChat = (chat: ChatMessage): void => {
//         this.setState(state => { return {...state, chats: [...state.chats, chat]}; });
//     };
// 
//     const block = (): void => {
//         console.log('Session terminated.');
//         this.state.remoteUsers.get(userId)?.pc?.close();
//         updateRemoteUser(_ => undefined);
//     }
//     return {
//         sendMessage,
//         addVideoElement,
//         handleRemoteUserHangup,
//         hangup,
//         block,
//         receiveChat,
//         updateRemoteUser
//     };
// }
// 
