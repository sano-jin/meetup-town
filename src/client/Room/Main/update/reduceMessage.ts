////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態を更新するための関数群
// - **サーバを介するメッセージの受信** による
//   **アプリのコアな部分** の状態遷移を実行するためのモジュール
// - 実装する機能
//   - チャットメッセージの送受信や PDF の送受信などのアプリケーション的な機能の実装
//   - 部屋の退出やビデオのお誘いの受信（WebRTC 関連の細かい実装は除く）
//   - WebRTC の offer/answer/candidate の処理などは，なし
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
// - そもそも，これがアプリケーションのメッセージと同じメッセージとして送られてくるのがあまり良くない気はする
// - 分離するようにリファクタしないと
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

	    default: // webRTC で通信の確立のためにごちゃごちゃやる
		dispatchWithRTCMessage(remoteUser, message, dispatchSendMessage, dispatchUpdateWithRTC, state);

		// とりあえずは，状態の更新はしないで戻しておく
		// あとで dispatchUpdateWithRTC を使ってさっき実行した関数（が bind するイベント）が
		// 状態の更新をしてくれるので
		return state;
	}
    });




