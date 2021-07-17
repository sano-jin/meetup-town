////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態を管理するだけのクラス
//
////////////////////////////////////////////////////////////////////////////////


// これはあくまで **状態** を管理するだけ．アプリのメイン画面は UI.tsx に移植した
//
// - これがトップレベル（エントリーポイント）となる
// - Elm Architecture でいうところの Model
// - Redux などで置き換えたい気分
//
// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


export { MainModel };


// Utility functions
import { getTimeString } from '../../../util'

// サーバとの通信
import { getInitRemoteUsers, getInitRemoteUser, handleMessage, ClientProps, maybeStart } from "./ts/client";
import io from "socket.io-client";

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, RemoteUser }	from "./ts/clientState";
import { Message }		from './../../../message';
import { ChatMessage }		from './../../../chatMessage';
import { UserInfo, UserId }	from './../../../userInfo';
import { PDFCommandType }	from './../../../PDFCommandType';

// React
import * as React from 'react';

// メイン画面の UI コンポーネント
import { UI } from "./UI"


// サーバとの通信のためのソケットを起動
const socket = io();


interface MainModelProps {
    userInfo: UserInfo;
    roomId: string;
}


// メインの状態を管理するだけのクラス
// React.FC を使うようにしたいと思ったが，ここに関してだけはそう簡単にもいかなさそう
// socket.on イベントリスナで状態を更新したいのだが，現状これがうまくできない．．．
// イベントハンドラ登録時の状態と，最新の状態が異なる（可能性がある）ため
class MainModel extends React.Component<MainModelProps, ClientState> {
    sendMessageTo: (toUserId: UserId | undefined) => (message: Message) => void;
    constructor(props: MainModelProps){
        super(props)
	// 初期状態
        this.state = {
	    socket	: socket,
            userId	: null, // 初期状態で userId は null．部屋に初めて join したときのサーバの返答から取得する
	    roomId	: props.roomId,
            userInfo	: props.userInfo,
            localStream	: null,			// 自分のカメラ映像
            remoteUsers	: new Map<UserId, RemoteUser>(), // 他のユーザの情報
            localStreamConstraints: {		// 自分のカメラ映像の設定．とりあえず，ビデオ・音声ともにオンにしている
                audio: true,
                video: true
            },
            chats: []				// チャットメッセージのリスト
        }


	
    }

    // このコンポーネントが初めて読み込まれたときに一回実行する関数
    componentDidMount(){
	// Elm Architecture で言うところの，update, command (dipatch) をバインドする
	// これらはコンストラクタに移動させても良いかも知れない

	////////////////////////////////////////////////////////////////////////////////
	// 
	// Redux などの導入を後でしやすくするために，
	// サブモジュールで定義され，親モジュールで使われる，状態変化（副作用）を起こす関数は，
	// `updateWith` + <呼び出す状況> のように命名することにする
	// これらの関数は
	// 1. ゼロ個以上の引数と，一つ前の状態を渡し
	// 2. 次の状態を返す（この戻り値を使って，状態の更新を行う）
	// 
	////////////////////////////////////////////////////////////////////////////////
	
	// 自分が部屋に入ったとサーバから返事が返ってきた場合
	// 自分の userId と先に部屋にいた人たちの情報をサーバに返してもらう
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            this.setState(updateWithJoined(myUserId, jsonStrOtherUsers));
	});

	// 他の人が入ってきた場合
        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
	    this.setState(updateWithAnotherJoin(userId, userInfo));
        });

	// サーバからメッセージを受信した場合
        socket.on('message', (userId: UserId, message: Message) => {
	    this.setState(updateWithMessage(userId, message));
        });

	////////////////////////////////////////////////////////////////////////////////
	// 
	// Redux を後で導入しやすくするために，
	// 親モジュールで定義され，サブモジュールで使われる，状態変化（副作用）を起こす関数は，
	// `dispatch` + <動作> のように命名することにする
	// 内部でさらに他の状態変化を起こす関数を呼び出す際は，
	// 1. それらを全て先に呼び出してから，
	// 2. （必要なら）状態の更新を行う
	// ように実装する
	// 
	////////////////////////////////////////////////////////////////////////////////

	// チャットメッセージの送信による状態変化
	const dispatchSendChatMessage = (chatMessage: ChatMessage) => {
	    this.dispatchSendMessageTo(undefined)({ type: 'chat', chatMessage }); // チャットをブロードキャスト送信
	    this.setState(state => ({
		...state, chats: [...state.chats, chatMessage] // 自分のチャットメッセージ一覧にも追加しておく
	    }));
	};

	// PDF の送信を行う命令 ???
	const sendPDFCommand = (command: PDFCommandType) => {
	    this.dispatchSendMessageTo(undefined)({type: 'pdfcommand', command});
	}


	// initial コマンド（初期状態において実行する副作用を持つ関数）
	
	// 自分のカメラ映像を取得する
	this.setState(updateLocalMedia);
        
        // サーバに部屋に入りたい旨を通知
        socket.emit('join', this.state.roomId, this.state.userInfo);
    }

    render() {
	return (<UI clientState={this.state}
		sendChatMessage={this.sendChatMessage}
		sendPDFCommand={this.sendPDFCommand}
		/>);
    }
}





const updateWithJoined = (myUserId: UserId, jsonStrOtherUsers: string) => (state: ClientState) => {
    console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);

    const remoteUsers =  new Map<UserId, RemoteUser>([...state.remoteUsers, ...getInitRemoteUsers(jsonStrOtherUsers)]);
    // 自分の状態に追加する他のユーザの情報
    if (state.localStream) { // すでに自分のカメラ映像が取れているなら，他の人にビデオ通話のお誘いをする
	console.log("Already found localStream before getting back the answer of the join message");
	for (const [userId, remoteUser] of remoteUsers.entries()) {
	    console.log(`calling ${userId}`);
	    this.sendMessageTo(userId)({ type: 'call' }); // この call はいるのだろうか？いらなくね？
	    if (remoteUser.amIInitiator) { // 自分が initiator なら RTCPeerConnection の設立をこっちが主導して行う？
		maybeStart(remoteUser, state.localStream, props(userId));
	    }
	}
    }
    return {
        ...state,
        userId: myUserId,
        remoteUsers: remoteUsers
    };
};



const updateWithAnotherJoin = (userId: UserId, userInfo: UserInfo) => (state) => {
    console.log(`Another user ${userId} has joined to our room`, userInfo);
    return {
        ...state,
        remoteUsers: new Map([...state.remoteUsers, [userId, getInitRemoteUser(userInfo)]])
    };
};



// サーバとのやりとりに必要な関数を渡すための下準備
// userId を受け取り，そのユーザへの対応を定義する関数のレコードを返す
const props = (userId: UserId): ClientProps => {
    
    const sendMessage = this.sendMessageTo(userId);

    const updateRemoteUser = (f: (oldRemoteUser: RemoteUser) => RemoteUser | undefined) => {
        this.setState((oldState: ClientState) => {
            const oldRemoteUser = oldState.remoteUsers.get(userId);
            if (oldRemoteUser === undefined) return oldState;
            const newRemoteUser = f(oldRemoteUser);
            if (newRemoteUser === undefined) {
                return {
                    ...oldState,
                    remoteUsers: new Map([...oldState.remoteUsers]
					 .filter(([id, _]) => id !== userId)
					)
                };
            } else { 
                return {...oldState, remoteUsers: new Map([...oldState.remoteUsers, [userId, newRemoteUser]])};
            }
        });
    };

    const addVideoElement =
        (remoteUserStream: MediaStream | null) => {
            updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream}; });
        };


    const hangup = () => {
        console.log('Hanging up.');
        stopVideo();
        sendMessage({ type: 'bye' });
    };

    const handleRemoteUserHangup = (): void => {
        stopVideo();
    };

    const stopVideo = (): void => {
        updateRemoteUser(oldRemoteUser => { return {...oldRemoteUser, remoteUserStream: null, isStarted: false }});
        
        // remoteUser.isStarted = false;
        // remoteUser.pc!.close();
        // remoteUser.pc = null;
    };

    const receiveChat = (chat: ChatMessage): void => {
        this.setState(state => { return {...state, chats: [...state.chats, chat]}; });
    };

    const block = (): void => {
        console.log('Session terminated.');
        this.state.remoteUsers.get(userId)?.pc?.close();
        updateRemoteUser(_ => undefined);
    }
    return {
        sendMessage,
        addVideoElement,
        handleRemoteUserHangup,
        hangup,
        block,
        receiveChat,
        updateRemoteUser
    };
}


const updateWithMessage = (userId: UserId, message: Message) => (state) => {
    if (message.type !== 'candidate') { // candidate は回数が多いのでそれ以外ならデバッグ用に表示
        console.log('Received message:', message, `from user ${userId}`);
    }
    const remoteUser: RemoteUser | undefined = this.state.remoteUsers.get(userId)!;
    if (remoteUser === undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
        throw Error(`remoteUser is null for ${userId}`);
    }
    handleMessage(remoteUser, message, this.state.localStream, props(userId));
});



const updateLocalMedia = (state) => {

    console.log("Going to find Local media");

    // If found local stream
    const gotStream = (stream: MediaStream): void => {
	console.log('Adding local stream.');
	this.setState((state) => { return {...state, localStream: stream}; });
	console.log('set state: added my local stream. Calling others (if there)');
	for (const [userId, remoteUser] of this.state.remoteUsers.entries()) {
	    console.log(`calling ${userId}`);
            this.sendMessageTo(userId)({ type: 'call' });
            if (remoteUser.amIInitiator) {
		maybeStart(remoteUser, stream, props(userId));
            }
	}
	console.log("Called others", this.state.remoteUsers)
    }

    // もし自分のカメラ映像を見つけられたら gotStream 関数を実行する
    navigator.mediaDevices.getUserMedia(this.state.localStreamConstraints)
	.then(gotStream)
	.catch((e) => {
            alert(`getUserMedia() error: ${e.name}`);
	});

}



// チャットメッセージを送信する
const sendChatMessage = (message: string) => {
    this.setState(state => {
        console.log("this.state", state);
        const chatMessage: ChatMessage = { // チャットメッセージ
            userId: state.userId ?? "undefined",
            time: getTimeString(),
            message: message,
        };
        this.sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage }); // チャットを送信
        return { ...state, chats: [...state.chats, chatMessage]}; // 自分のところにも追加しておく
    });
};

const sendPDFCommand = (com: PDFCommandType) => {
    const message: Message = {type: "pdfcommand", command: com};
    this.sendMessageTo(undefined)(message);
}

