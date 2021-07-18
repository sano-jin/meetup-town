////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態を更新するための関数群
// - **部屋へのログイン関連** のサーバを介する通信や，ローカルのカメラ映像を取得するなどの
//   **アプリのコアな部分** の状態遷移を実行するためのモジュール
// - メッセージの受信を行う関数はここにはない
// - WebRTC 周りの API を相互に呼び合う実装はここにはしない
// 
////////////////////////////////////////////////////////////////////////////////


// ファイル分割したほうが良さそう

// - Elm Architecture でいうところの update, command
// - Redux などで置き換えたい気分
//
// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


export {
    updateWithJoined,		// 自分が部屋に入ったとサーバから返事が返ってきた場合の処理
    updateWithAnotherJoin,	// 他の人が入ってきた場合の処理
    dispatchLocalMedia		// 自分のカメラ映像を取得する
};


// サーバとの通信
// import { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart } from "./ts/client";
import { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart } from "./ts/client";
import io from "socket.io-client";

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, RemoteUser, StreamConstraints }	from "./../ts/clientState";
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
// 自分が初めて部屋にはいった時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////


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



////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// 他の人が新しく部屋に入ってきた時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////


// 他の人が部屋に入ってきたときに，その人の初期状態を返す
// 特に通信をするわけではない，純粋なコンビネータ
// 通信するわけではないので，clientState.ts に移した方が良いかも
const initialRemoteUserOf = (userInfo: UserInfo) => ({
    userInfo		: userInfo,
    isChannelReady	: true,		// ビデオ通話可能な状態である
    amIInitiator	: false,	// こっちから WebRTC の offer はしない
    isStarted		: false,	// まだ WebRTC の PeerConnection は設立していない
    pc			: null,		// WebRTC の PeerConnection
    remoteStream	: null		// 相手のカメラ映像はまだ取れていない
});


// 他の人が新しく部屋に入ってきた時に呼ばれる関数
// とりあえずは，どのみち，相手から WebRTC の offer が来るので，call はしないことにする（けどどうだろう？）
const updateWithAnotherJoin = (userId: UserId, userInfo: UserInfo) => (state: ClientState): ClientState => {
    console.log(`Another user ${userId} has joined to our room`, userInfo);
    return {
        ...state,
        remoteUsers: new Map([...state.remoteUsers, [userId, initialRemoteUserOf(userInfo)]])
    };
};





////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// サーバからメッセージを受信した時に呼ばれる関数
//
/////////////////////////////////////////////////////////////////////////////////


// サーバからメッセージを受信した時に呼ばれる関数
const updateWithMessage =
    ( userId: UserId, message: Message
    , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC) =>
    (state: ClientState): ClientState => {
	    if (message.type !== 'candidate') { // candidate は回数が多いので，それ以外ならデバッグ用に表示ということにする
		console.log('Received message:', message, `from user ${userId}`);
	    }
	    const remoteUser: RemoteUser | undefined = this.state.remoteUsers.get(userId);
	    if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
		throw Error(`remoteUser is undefined for ${userId}`);
	    }
	    return handleMessage(remoteUser, message, this.state.localStream, props(userId));
});




////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// ローカルのカメラ映像を取得し，取得できたら他のユーザへビデオ通話のお誘いをする
//
/////////////////////////////////////////////////////////////////////////////////


// ローカルのカメラ映像を取得できた時に呼ばれる関数
const dispatchGotLocalMedia =
    (dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC) =>
	(localStream: MediaStream): void => {
	    console.log('Adding local stream');
	    dispatchUpdateWithRTC(state => ({...state, localStream}))();

	    console.log('Calling others (if there)', this.state.remoteUsers);
	for (const [userId, remoteUser] of this.state.remoteUsers.entries()) {
	    console.log(`calling ${userId}`);
	    dispatchVideoCall(remoteUser, state.localStream, dispatchSendMessageTo(userId), dispatchUpdateWithRTC);
	}
    };



// ローカルのカメラ映像を取得しようとする関数
const dispatchLocalMedia =
    ( localStreamConstraints: StreamConstraints
      , dispatchSendMessage: DispatchSendMessage, dispatchUpdateWithRTC: DispatchUpdateWithRTC): void => {
	console.log("Going to find Local media");

	// もし自分のカメラ映像を見つけられたら dispatchGotLocalMedia 関数を実行する
	navigator.mediaDevices.getUserMedia(localStreamConstraints)
		 .then(dispatchGotLocalMedia(dispatchSendMessageTo, dispatchUpdateWithRTC))
		 .catch(e => alert(`getUserMedia() error: ${e.name}`));
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
