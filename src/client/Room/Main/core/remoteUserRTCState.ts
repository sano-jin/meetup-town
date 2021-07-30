////////////////////////////////////////////////////////////////////////////////
//
// WebRTC 関連のデータを一元的に管理するための Model
//
////////////////////////////////////////////////////////////////////////////////

// 基本的に，アプリを拡張実装する人は読む必要のないコード
// React で管理する状態ではないので，副作用ありき（かも）

//
// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ



export {
    dispatchWithRTCMessage,		
};


// サーバとの通信
export { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart };

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, RemoteUser, StreamConstraints }	from "./../clientState";
import { Message }		from './../../../message';
import { UserInfo, UserId }	from './../../../userInfo';



// 他のユーザの状態，サーバとの通信でやりとりするものの型など
import { turnConfig }		from './config';
import { RemoteUser }		from './clientState'
import { Message }		from './../../../../message';
import { UserInfo, UserId }	from './../../../../userInfo'; // 
import { ChatMessage }		from './../../../../chatMessage'


////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// リモートユーザの WebRTC の Peer Connection の状態を管理するためのクラス
// - React とは紐づいていない（紐付けるとネットワークの状態が変化した際にコンポーネントの再レンダリングが発生する可能性がある）
//
////////////////////////////////////////////////////////////////////////////////



// 他のユーザの RTC Peer Connection に関連する情報
// - ただし，stream はここにはない（React で管理する）
// - 非同期関連のバグを防ぐため，これらのデータは破壊的更新をする
// - また，React では管理しない
// - ただし，これが良いデザインパターンかはわからない
interface RemoteUserRTCState {
    isChannelReady	: boolean,			// WebRTC のチャネルがすでに通信可能な状態になっているか
    amIInitiator	: boolean,			// WebRTC の通信を行う際に，こちらから offer をするか
    isStarted		: boolean,			// WebRTC の通信がすでに始まっているか
    pc			: null | RTCPeerConnection,     // WebRTC Peer connection
}





// 自分よりも先にいた人たちの RemoteUserRTCState の初期状態
const predInitRTCState: RemoteUserRTCState = {
    isChannelReady	: true,		// ビデオ通話可能な状態である
    amIInitiator	: true,		// こっちから WebRTC の offer をする
    isStarted		: false,	// まだ WebRTC の通信は始まっていない
    pc			: null,		// まだ WebRTC の PeerConnection は設立していない
};
    

// 自分よりも後から入ってきた人の RemoteUserRTCState の初期状態
const succInitRTCState: RemoteUserRTCState = {
    isChannelReady	: true,		// ビデオ通話可能な状態である
    amIInitiator	: false,	// こっちから WebRTC の offer はしない
    isStarted		: false,	// まだ WebRTC の PeerConnection は設立していない
    pc			: null,		// WebRTC の PeerConnection
});





// 他のユーザの RTC Peer Connection に関連する情報の一覧
// - この Map object のキーは React で管理している userInfo の一覧と常に同じであるはずである
// - TODO: それを検証するための単体テストを書く
type RemoteUserRTCStateMap = Map<UserId, RemoteUserRTCState>;


// global object として，変数を宣言しているが，クラスにまとめたほうが良いかも
class RemoteUserRTCStates {
    private remoteUserRTCStateMap: RemoteUserRTCStateMap;

    constructor() {
	this.remoteUserRTCStateMap = new Map();
    }

    // remoteUser の RTC PeerConnection の状態を取得する
    getRemoteUserRTCState(userId: UserId): RemoteUserRTCState {
	const remoteUser: RemoteUser | undefined = state.remoteUsers.get(userId); // remoteUser を取得
	if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
	    throw Error(`remoteUser is undefined for ${userId}`);
	}
	return remoteUser; 
    }

    // remoteUser の RTC PeerConnection の情報を追加・削除する
    updateRemoteUser(userId: UserId, remoteUserRTCState: undefined | RemoteUserRTCState): void {
	if (remoteUserRTCState === undefined) { // 削除する場合
	    if (!this.remoteUserRTCStateMap.has(userId)) { throw Error(`the user ${userId} did not exist`)} // TODO: テストコードに分離
	    this.remoteUserRTCStateMap.delete(userId);
	} else { // 追加する場合
	    if (this.remoteUserRTCStateMap.has(userId)) { throw Error(`the user ${userId} already exists`)} // TODO: テストコードに分離
	    this.remoteUserRTCStateMap.set(userId, remoteUserRTCState);
	}
    }
}


////////////////////////////////////////////////////////////////////////////////
//
// update
//
/////////////////////////////////////////////////////////////////////////////////


// 自分が初めて部屋に入ったときにサーバから受信した，すでにいた他の人の情報を，追加する
const addPredRemoteUserRTCStates = (remoteUserRTCStates: RemoteUserRTCStates, userIds: UserId[]): void => {
    userIds.forEach(userId => remoteUserRTCStates.updateRemoteUser(userId, predInitRTCState));
}

// 後から部屋に入ってきた人の情報を追加する
const addSuccRemoteUserRTCState = (remoteUserRTCStates: RemoteUserRTCStates, userId: UserId): void => {
    remoteUserRTCStates.updateRemoteUser(userId, succInitRTCState);
}


////////////////////////////////////////////////////////////////////////////////



////////////////////////////////////////////////////////////////////////////////
//
// 自分が初めて部屋にはいった時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////




// 自分が初めて部屋に入ったときにサーバから受信した，すでにいた他の人の文字列情報を，各ユーザ情報へ変換する
// 純粋なコンビネータ
const initialRemoteUserRTCStatesOf = (predUserIds: UserId[]): RemoteUserRTCStateMap => {
    // 他の人のユーザ情報からそのユーザの初期状態へ変換する関数
    return new Map<UserId, RemoteUser>(predUserIds.map((userId: UserId) => [userId, predInitRTCState]));
};




// 自分が初めて部屋に入ったときにサーバから受信した，すでにいた他の人の文字列情報を，各ユーザ情報へ変換する
// 純粋なコンビネータ
const initialRemoteUsersOf = (jsonStrOtherUserInfos: string): Map<UserId, RemoteUser> => {
    const otherUserInfos: Map<UserId, UserInfo> = json2Map(jsonStrOtherUserInfos);

    // 他の人のユーザ情報からそのユーザの初期状態へ変換する関数
    const remoteUserOf = ([userId: UserId, userInfo: UserInfo]): [UserId, RemoteUser] => ([
	userId, {
            userInfo		: userInfo,
            isChannelReady	: true,		// ビデオ通話可能な状態である
            amIInitiator	: true,		// こっちから WebRTC の offer をする
            isStarted		: false,	// まだ WebRTC の通信は始まっていない
            pc			: null,		// まだ WebRTC の PeerConnection は設立していない
            remoteStream	: null		// 相手のカメラ映像はまだ取れていない
    }]);
    
    return new Map<UserId, RemoteUser>([...otherUserInfos].map(remoteUserOf));
};



// ビデオ通話を行おうとする
// RemoteUser の WebRTC 関連の情報は破壊的代入により更新する
// 全く純粋でない関数
const dispatchVideoCall =
    ( remoteUser: RemoteUser, localStream: MediaStream
    , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC) => {
	console.log(`>>>> dispatchVideoCall to ${remoteUser.userInfo}`);

	// RTCPeerConnection の設立を試みる
	maybeStart(remoteUser, localStream, dispatchSendMessage, dispatchUpdateWithRTC);
	
	// 自分が initiator でないなら，WebRTC の offer は相手に出してもらうために call を送る
	// 論理的にではなく，実際に，こういう状況になることがあるのかは，実のところ，よくわからない
	if (!remoteUser.amIInitiator) { 
	    dispatchSendMessage({ type: 'call' }); 
	}
    };



// 自分が部屋に入ったとサーバから返事が返ってきた場合
// 自分の userId と先に部屋にいた人たちの情報をサーバに返してもらう
const updateWithJoined =
    ( myUserId: UserId, jsonStrOtherUsers: string
    , dispatchSendMessageTo: DispatchSendMessageTo, dispatchUpdateWithRTC: DispatchUpdateWithRTC) => 
    (state: ClientState): ClientState => {
	    console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);
	    
	    // 自分の状態に追加する他のユーザの情報
	    const remoteUsers = new Map<UserId, RemoteUser>([...state.remoteUsers, ...initialRemoteUsersOf(jsonStrOtherUsers)]);
	    console.log("new remoteUsers", map2Json(remoteUsers));

	    if (state.localStream) { // すでに自分のカメラ映像が取れているなら，他の人にビデオ通話のお誘いをする
		console.log("Already found localStream before getting back the answer of the join message");
		for (const [userId, remoteUser] of remoteUsers.entries()) {
		    console.log(`calling ${userId}`);
		    dispatchVideoCall(remoteUser, state.localStream, dispatchSendMessageTo(userId), dispatchUpdateWithRTC);
		}
	    }
	    return {
		...state,
		userId: myUserId,
		remoteUsers: remoteUsers
	    };
	};













// 
// 
// // Main.tsx において実装される関数などの型
// type SendMessage	= (message: Message) => void;
// type AddVideoElement	= (remoteStream: MediaStream | null) => void;
// type Hangup		= () => void;
// type ReceiveChat	= (chat: ChatMessage) => void;
// type UpdateRemoteUser	= (f: (oldRemoteUser: RemoteUser) => RemoteUser | undefined) => void;
// interface ClientProps {
//     sendMessage		: SendMessage;
//     addVideoElement	: AddVideoElement;
//     handleRemoteUserHangup	: Hangup;
//     hangup		: Hangup;
//     block		: Hangup;
//     receiveChat		: ReceiveChat;
//     updateRemoteUser	: UpdateRemoteUser;
// };
// 
// 
// 
// 
// 
// 
// // toUserId にメッセージを送る関数の型
// type DispatchSendMessageTo = (toUserId: UserId | undefined) => (message: Message) => void;
// 
// // 特定のユーザ（既に固定済み）にメッセージを送る関数の型
// type DispatchSendMessage = (message: Message) => void;
// 
// // WebRTC 関連の動作をする際に，React の状態を更新しなくてはいけない時は，この関数を実行する
// // `() =>` が余計についているのは，すぐにこの関数を実行したいとは限らないため
// // - むしろ，WebRTC のイベントにバインドすることがほとんど（イベントが発火した時に初めて呼ばれる）
// type DispatchUpdateWithRTC = (updateWithRTC: (state: ClientState) => ClientState) => () => void;
// 
// 
// 
// 
// 
// 
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// 
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// //
// // 自分が初めて部屋にはいった時に呼ばれる関数
// //
// /////////////////////////////////////////////////////////////////////////////////
// 
// 
// 
// // 自分が初めて部屋に入ったときにサーバから受信した，すでにいた他の人の文字列情報を，各ユーザ情報へ変換する
// // 純粋なコンビネータ
// const initialRemoteUsersOf = (jsonStrOtherUserInfos: string): Map<UserId, RemoteUser> => {
//     const otherUserInfos: Map<UserId, UserInfo> = json2Map(jsonStrOtherUserInfos);
// 
//     // 他の人のユーザ情報からそのユーザの初期状態へ変換する関数
//     const remoteUserOf = ([userId: UserId, userInfo: UserInfo]): [UserId, RemoteUser] => ([
// 	userId, {
//             userInfo		: userInfo,
//             isChannelReady	: true,		// ビデオ通話可能な状態である
//             amIInitiator	: true,		// こっちから WebRTC の offer をする
//             isStarted		: false,	// まだ WebRTC の通信は始まっていない
//             pc			: null,		// まだ WebRTC の PeerConnection は設立していない
//             remoteStream	: null		// 相手のカメラ映像はまだ取れていない
//     }]);
//     
//     return new Map<UserId, RemoteUser>([...otherUserInfos].map(remoteUserOf));
// };
// 
// 
// 
// 
// 
// 
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// //
// // 以下は WebRTC を用いたリアルタイム通信のための API の処理
// //
// ////////////////////////////////////////////////////////////////////////////////
// 
// 
// 
// // webRTC で通信の確立のためにごちゃごちゃやる
// const dispatchWithRTCMessage =
//     ( remoteUser, RemoteUser, message: Message
//       , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC
//       , state: ClientState): ClientState => {
//         switch (message.type) {
// 	    case 'call': // ビデオ通話のお誘い（実はこれは WebRTC のメッセージではない）
//                 if (state.localStream === null) { // 自分のカメラ映像を取得できていなかったら
// 		    // 自分のカメラ映像を取得し，取得できたら相手へ offer をする
// 		    dispatchLocalMedia(state.localStreamConstraints, dispatchSendMessage, dispatchUpdateWithRTC);
// 		} else {
// 		    // 自分のカメラ映像を取得できているなら RTCPeerConnection の設立を試みる
// 		    maybeStart(remoteUser, state.localStream, dispatchSendMessage, dispatchUpdateWithRTC);
// 		}
// 		return;
// 
//             case 'offer': // WebRTC の offer
// 		if (state.localStream === null) { // 自分のカメラ映像を取得できていなかったら
// 		    // 自分のカメラ映像を取得し，取得できたら相手へ call して，もう一度 offer してもらう
// 		    dispatchLocalMedia(state.localStreamConstraints, dispatchSendMessage, dispatchUpdateWithRTC);
// 		} else {
// 		    // 自分のカメラ映像を取得できているなら RTCPeerConnection の設立を試みる
//                     console.log(`starting communication with an offer`);
// 		    maybeStart(remoteUser, state.localStream, dispatchSendMessage, dispatchUpdateWithRTC)
// 			.pc?
// 			.setRemoteDescription(message)
// 			.then(() => doAnswer(newRemoteUser.pc!, props.sendMessage));
//                 }
//                 return;
// 
//             case 'answer': // WebRTC の answer
//                 if (remoteUser.pc === null) {
//                     throw Error(`received an answer but the peer connection is null`, remoteUser);
//                 }
//                 if (remoteUser.isStarted) {
//                     remoteUser.pc.setRemoteDescription(message)
//                         .catch(e => console.log(e));
//                 }
//                 return;
// 
//             case 'candidate':
//                 if (remoteUser.pc === null) {
//                     throw Error(`received a candidate but the peer connection is null`, remoteUser);
//                 }
//                 if (remoteUser.isStarted) {
//                     const candidate = new RTCIceCandidate({
//                         sdpMLineIndex: message.label,
//                         candidate: message.candidate
//                     });
//                     remoteUser.pc.addIceCandidate(candidate);
//                 }
//                 return;
// 
//             default:
//                 throw Error(`received message has unknown type ${message.type}`)
//         }
//     };
// 
// 
// 
// ////////////////////////////////////////////////////////////////////////////////
// 
// // 以上がメッセージによる分岐
// 
// 
// // If initiator, create the peer connection
// const maybeStart =
//     (remoteUser: RemoteUser, localStream: MediaStream, props: ClientProps): RemoteUser => {
//         console.log(
//             '>>>>>>> maybeStart() ',
//             remoteUser.isStarted,
//             localStream,
//             remoteUser.isChannelReady
//         );
//         if (!remoteUser.isStarted && remoteUser.isChannelReady) {
//             console.log('>>>>>> creating peer connection');
//             const pc = createPeerConnection(remoteUser, props);
//             localStream
//                 .getTracks()
//                 .forEach(track => pc.addTrack(track, localStream));
//             remoteUser.pc = pc;
//             remoteUser.isStarted = true;
// 
//             return { ...remoteUser, pc: pc, isStarted: true };
//         } else return remoteUser;
//     }
// 
// /*
// window.onbeforeunload = (e: Event): void => {
//     e.preventDefault();
//     e.returnValue = false;
//     for (const [userId, _] of clientState.remoteUsers.entries()) {
//         sendMessage({ type: 'bye' }, userId);
//     }
// };
// */
// 
// // Creating peer connection
// const createPeerConnection =
//     (remoteUser: RemoteUser, props: ClientProps): RTCPeerConnection => {
//         try {
//             const pc = new RTCPeerConnection(turnConfig);
//             pc.onicecandidate = handleIceCandidate(props.sendMessage);
//             pc.ontrack = handleRemoteUserStream(props.addVideoElement);
//             pc.onnegotiationneeded = handleNegotiationNeededEvent(pc, remoteUser, props.sendMessage);
//             pc.oniceconnectionstatechange = handleICEConnectionStateChangeEvent(pc, props);
//             pc.onsignalingstatechange = handleSignalingStateChangeEvent(pc, props);
//             // pc.onremovestream = handleRemoteUserStreamRemoved; // deprecated
//             console.log('Created RTCPeerConnnection');
//             return pc;
//         } catch (e) {
//             console.log(`Failed to create PeerConnection, exception: ${e.message}`);
//             throw Error('Cannot create RTCPeerConnection object.');
//         }
//     }
// 
// const handleNegotiationNeededEvent =
//     (pc: RTCPeerConnection, remoteUser: RemoteUser, sendMessage: SendMessage) => () => {
//         console.log(`handleNegotiationNeededEvent`, remoteUser);
//         pc.createOffer() // Creates an offer
//             .then((sessionDescription) => {
//                 if (remoteUser.amIInitiator) {
//                     setLocalAndSendMessage(pc, sendMessage)(sessionDescription);
//                 }
//             })
//             .catch(e => console.log(e));
//     }
// 
// // to handle Ice candidates
// const handleIceCandidate =
//     (sendMessage: SendMessage) => (event: RTCPeerConnectionIceEvent): void => {
//         if (event.candidate) {
//             sendMessage({
//                 type: 'candidate',
//                 label: event.candidate.sdpMLineIndex,
//                 id: event.candidate.sdpMid,
//                 candidate: event.candidate.candidate
//             });
//         } else {
//             console.log('End of candidates.');
//         }
//     }
// 
// const doAnswer = (pc: RTCPeerConnection, sendMessage: SendMessage): void => {
//     console.log(`Sending answer to peer`);
//     pc.createAnswer()
//         .then(setLocalAndSendMessage(pc, sendMessage))
//         .catch(error => console.trace(`Failed to create session description: ${error.toString()}`));
// };
// 
// const setLocalAndSendMessage =
//     (pc: RTCPeerConnection, sendMessage: SendMessage) =>
//         (sessionDescription: RTCSessionDescriptionInit): void => {
//             pc.setLocalDescription(sessionDescription)
//                 .then(() => {
//                     console.log("sending sessionDescription", sessionDescription);
//                     sendMessage(sessionDescription);
//                 })
//                 .catch(e => console.log(e));
//         };
// 
// 
// const handleRemoteUserStream =
//     (addVideoElement: AddVideoElement) => (event: RTCTrackEvent): void => {
//         console.log("handleRemoteUserStream", event);
//         if (event.streams.length >= 1) {
//             addVideoElement(event.streams[0]);
//         } else {
//             addVideoElement(null);
//         }
//     };
// 
// const handleICEConnectionStateChangeEvent =
//     (pc: RTCPeerConnection, props: ClientProps) =>
//         (_: Event) => {
//             switch (pc.iceConnectionState) {
//                 case "closed":
//                 case "failed":
//                     props.handleRemoteUserHangup();
//                     break;
//             }
//         };
// 
// const handleSignalingStateChangeEvent =
//     (pc: RTCPeerConnection, props: ClientProps) =>
//         (_: Event) => {
//             switch (pc.signalingState) {
//                 case "closed":
//                     props.handleRemoteUserHangup();
//                     break;
//             }
//         };
// 
// 
// 
// 
// 
// 
// // ////////////////////////////////////////////////////////////////////////////////
// // 
// // 
// // ////////////////////////////////////////////////////////////////////////////////
// // //
// // // アプリケーションメッセージの送信
// // //
// // /////////////////////////////////////////////////////////////////////////////////
// // 
// // 
// // 
// // // チャットメッセージを送信する
// // const sendChatMessage = (message: string) => {
// //     this.setState(state => {
// //         console.log("this.state", state);
// //         const chatMessage: ChatMessage = { // チャットメッセージ
// //             userId: state.userId ?? "undefined",
// // 					   time: getTimeString(),
// // 					   message: message,
// //         };
// //         this.sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage }); // チャットを送信
// //         return { ...state, chats: [...state.chats, chatMessage]}; // 自分のところにも追加しておく
// //     });
// // };
// // 
// // const sendPDFCommand = (com: PDFCommandType) => {
// //     const message: Message = {type: "pdfcommand", command: com};
// //     this.sendMessageTo(undefined)(message);
// // }
// // 
// // 
// // 
// // 
// // 
// // 
// // 
// // 
// // 
// // // サーバとのやりとりに必要な関数を渡すための下準備
// // // userId を受け取り，そのユーザへの対応を定義する関数のレコードを返す
// // const props = (userId: UserId): ClientProps => {
// //     
// //     const sendMessage = this.sendMessageTo(userId);
// // 
// //     const updateRemoteUser = (f: (oldRemoteUser: RemoteUser) => RemoteUser | undefined) => {
// //         this.setState((oldState: ClientState) => {
// //             const oldRemoteUser = oldState.remoteUsers.get(userId);
// //             if (oldRemoteUser === undefined) return oldState;
// //             const newRemoteUser = f(oldRemoteUser);
// //             if (newRemoteUser === undefined) {
// //                 return {
// //                     ...oldState,
// //                     remoteUsers: new Map([...oldState.remoteUsers]
// // 					 .filter(([id, _]) => id !== userId)
// // 					)
// //                 };
// //             } else { 
// //                 return {...oldState, remoteUsers: new Map([...oldState.remoteUsers, [userId, newRemoteUser]])};
// //             }
// //         });
// //     };
// // 
// //     const addVideoElement =
// //         (remoteUserStream: MediaStream | null) => {
// //             updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream}; });
// //         };
// // 
// // 
// //     const hangup = () => {
// //         console.log('Hanging up.');
// //         stopVideo();
// //         sendMessage({ type: 'bye' });
// //     };
// // 
// //     const handleRemoteUserHangup = (): void => {
// //         stopVideo();
// //     };
// // 
// //     const stopVideo = (): void => {
// //         updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream: null, isStarted: false }});
// //         
// //         // remoteUser.isStarted = false;
// //         // remoteUser.pc!.close();
// //         // remoteUser.pc = null;
// //     };
// // 
// //     const receiveChat = (chat: ChatMessage): void => {
// //         this.setState(state => { return {...state, chats: [...state.chats, chat]}; });
// //     };
// // 
// //     const block = (): void => {
// //         console.log('Session terminated.');
// //         this.state.remoteUsers.get(userId)?.pc?.close();
// //         updateRemoteUser(_ => undefined);
// //     }
// //     return {
// //         sendMessage,
// //         addVideoElement,
// //         handleRemoteUserHangup,
// //         hangup,
// //         block,
// //         receiveChat,
// //         updateRemoteUser
// //     };
// // }
// // 
// 
