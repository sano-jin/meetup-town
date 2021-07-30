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


export { ReactModel };


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

// React
import * as React from 'react';

// メイン画面の UI コンポーネント
import { View } from "./View"


// サーバとの通信のためのソケットを起動
const socket = io();


interface MainModelProps {
    userInfo: UserInfo;
    roomId: string;
}

// toUserId にメッセージを送る関数の型
type DispatchSendMessageTo = (toUserId: UserId | undefined) => (message: Message) => void;

// 特定のユーザ（既に固定済み）にメッセージを送る関数の型
type DispatchSendMessage = (message: Message) => void;

// WebRTC 関連の動作をする際に，React の状態を更新しなくてはいけない時は，この関数を実行する
// `() =>` が余計についているのは，すぐにこの関数を実行したいとは限らないため
// - むしろ，WebRTC のイベントにバインドすることがほとんど
type DispatchUpdateWithRTC = (updateWithRTC: (state: ClientState) => ClientState) => () => void;



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


// 他のユーザの RTC Peer Connection に関連する情報の一覧
// - この Map object のキーは React で管理している userInfo の一覧と常に同じであるはずである
// - TODO: それを検証するための単体テストを書く
type RemoteUserRTCStates = Map<UserId, RemoteUser>;

// global object として，変数を宣言しているが，クラスにまとめたほうが良いかも
const remoteUserRTCStates: RemoteUserRTCStates = new Map<UserId, RemoteUser>();


// WebRTC 関連のメッセージを受信したりした後に状態を更新するための関数
// 基本的に WebRTC PeerConnection オブジェクトのイベントリスナーにバインドするためだけに用いる（ので余計な `() =>` がある）
const getRemoteUserRTCState = (userId: UserId) => {
    const remoteUser: RemoteUser | undefined = state.remoteUsers.get(userId); // remoteUser を取得
    if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
	throw Error(`remoteUser is undefined for ${userId}`);
	}
    return remoteUser; 
}





////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////
//
// React でメインの状態を管理するためのクラス
//
////////////////////////////////////////////////////////////////////////////////

// メインの状態を管理するだけのクラス
// React.FC を使うようにしたいと思ったが，ここに関してだけはそう簡単にもいかなさそう
// socket.on イベントリスナで状態を更新したいのだが，現状これがうまくできない．．．
// イベントハンドラ登録時の状態と，最新の状態が異なる（可能性がある）ため
class ReactModel extends React.Component<MainModelProps, ClientState> {
    constructor(props: MainModelProps){
        super(props)
	// 初期状態
        this.state = {
	    socket	: socket,
            userId	: null, // 初期状態で userId は null．部屋に初めて join したときのサーバの返答から取得する
	    roomId	: props.roomId, // いらないかも ???
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

    // Elm で言うところの Command，Redux でいうところの dispatcher を bind する

    ////////////////////////////////////////////////////////////////////////////////
    // 
    // Redux を後で導入しやすくするために，
    // 基本的に親モジュールで定義され，サブモジュールで使われる，
    // 状態変化（副作用）を起こす関数は，
    // `dispatch` + <動作> のように命名することにする
    // 内部でさらに他の状態変化を起こす関数を呼び出す際は，
    // 1. それらを全て先に呼び出してから，
    // 2. （必要なら）状態の更新を行う
    // ように実装する
    // 
    ////////////////////////////////////////////////////////////////////////////////

    // toUserId にサーバを介してメッセージを送信する
    // toUserId が undefined だった場合は，ブロードキャストする
    dispatchSendMessageTo = (toUserId: UserId | undefined) => (message: Message) => {
        const send = () => {
            const myUserId = this.state.userId;
            if (myUserId === null) { // 自分のユーザ id がまだわかっていないときは 0.5 秒スリープしてから再度トライする
                console.log("timeout: myUserId is null");
                setTimeout(send, 500);
                return;
            } else socket.emit('message', myUserId, message, this.props.roomId, toUserId);
        };
        send();
    };

    // チャットメッセージの送信による状態変化
    dispatchSendChatMessage = (chatMessage: ChatMessage): void => {
	this.dispatchSendMessageTo(undefined)({ type: 'chat', chatMessage }); // チャットをブロードキャスト送信
	this.setState(state => ({
	    ...state, chats: [...state.chats, chatMessage] // 自分のチャットメッセージ一覧にも追加しておく
	}));
    };

    // PDF の送信を行う命令 ???
    dispatchSendPDFCommand = (command: PDFCommandType): void => {
	this.dispatchSendMessageTo(undefined)({type: 'pdfcommand', command});
    };

    // WebRTC 関連のメッセージを受信したりした後に状態を更新するための関数
    // 基本的に WebRTC PeerConnection オブジェクトのイベントリスナーにバインドするためだけに用いる（ので余計な `() =>` がある）
    // どうせ，ローカル・リモートのストリームを追加・削除するだけなので，ここでそれぞれの dispatcher を実装しても良いかも
    dispatchUpdateWithRTCEvent = (updateWithRTC: (state: ClientState) => ClientState) => () => {
	this.setState(updateWithRTC); 
    }
    
//    // WebRTC 関連
//    // リモートのストリームを追加・削除
//    dispatchUpdateRemoteStream = (userId: UserId, remoteStream: null | MediaStream): void => {
//	const remoteUser: RemoteUser | undefined = state.remoteUsers.get(userId); // remoteUser を取得
//	if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
//	    throw Error(`remoteUser is undefined for ${userId}`);
//	}
//	this.setState(state => ({
//	    ...state, remoteUsers: new Map([...state.remoteUsers, [userId, {...remoteUser, remoteStream}]])
//	}))
//    }
//    
//
//    // リモートのストリームを追加・削除
//    dispatchUpdateRemoteStream = (userId: UserId, remoteStream: null | MediaStream): void => {
//	const remoteUser: RemoteUser | undefined = state.remoteUsers.get(userId); // remoteUser を取得
//	if (remoteUser == undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
//	    throw Error(`remoteUser is undefined for ${userId}`);
//	}
//	this.setState(state => ({
//	    ...state, remoteUsers: new Map([...state.remoteUsers, [userId, {...remoteUser, remoteStream}]])
//	}))
//    }
//    
//    
//

    // このコンポーネントが初めて読み込まれたときに一回実行する関数
    componentDidMount(){
	// Elm Architecture で言うところの，update をバインドする
	// これらはコンストラクタに移動させても良いかも知れない

	////////////////////////////////////////////////////////////////////////////////
	// 
	// Redux などの導入を後でしやすくするために，
	// 基本的に，サブモジュールで定義され，親モジュールで使われる，
	// 状態変化を起こすために次の状態を求める関数は，
	// `updateWith` + <呼び出す状況・引数とか> のように命名することにする
	// これらの関数は
	// 1. ゼロ個以上の引数と
	// 2. 一つ前の状態を受け取り
	// 3. 次の状態を返す（この戻り値を使って，状態の更新を行う）
	// 
	////////////////////////////////////////////////////////////////////////////////
	
	// 自分が部屋に入ったとサーバから返事が返ってきた場合
	// 自分の userId と先に部屋にいた人たちの情報をサーバに返してもらう
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            this.setState(updateWithJoined(myUserId, jsonStrOtherUsers, this.dispatchSendMessageTo, this.dispatchUpdateWithRTC));
	});

	// 他の人が入ってきた場合
        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
	    this.setState(updateWithAnotherJoin(userId, userInfo));
        });

	// サーバからメッセージを受信した場合
        socket.on('message', (userId: UserId, message: Message) => {
	    this.setState(updateWithMessage(userId, message, this.dispatchSendMessageTo, this.dispatchUpdateWithRTC));
        });


	////////////////////////////////////////////////////////////////////////////////
	// 
	// initial コマンド（初期状態において実行する副作用を持つ関数）
	//
	////////////////////////////////////////////////////////////////////////////////
	
	// 自分のカメラ映像を取得する
	dispatchLocalMedia(this.state.localStreamConstraints, this.dispatchSendMessageTo, this.dispatchUpdateWithRTC);
        
        // サーバに部屋に入りたい旨を通知
        socket.emit('join', this.state.roomId, this.state.userInfo);
    }

    render() {
	return (<View clientState		={this.state}
		      dispatchSendChatMessage	={this.dispatchSendChatMessage}
	              dispatchSendPDFCommand	={this.dispatchSendPDFCommand}
	/>);
    }
}


