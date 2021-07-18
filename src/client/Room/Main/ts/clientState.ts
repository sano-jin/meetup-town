////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態の型
//
////////////////////////////////////////////////////////////////////////////////

// 


export { ClientState, RemoteUser };

// サーバと共有する情報の型
import { UserInfo, UserId }	from './../../../../userInfo';
import { ChatMessage }		from './../../../../chatMessage';

// socket.io : サーバとの通信に必要なライブラリ
import io from "socket.io-client";



// クライアントサイドの状態
// 
interface ClientState {
    socket			: SocketIOClient.Socket,
    userId			: null | UserId,
    // 初期状態で userId は null．部屋に初めて join したときのサーバの返答から取得する
    roomId			: string,
    userInfo			: UserInfo,
    localStream			: null | MediaStream,	// 自分のカメラ映像
    localStreamConstraints	: StreamConstraints,    // 自分のカメラ映像の設定
    chats			: ChatMessage[],        // チャットメッセージのリスト                        
    remoteUsers			: Map<string, RemoteUser>,  // 他のユーザの情報
}

// 他のユーザの情報
interface RemoteUser {
    userInfo		: UserInfo,			// ユーザの情報
    remoteStream	: null | MediaStream,		// WebRTC によって得られた相手のカメラ映像
    isChannelReady	: boolean,			// WebRTC のチャネルがすでに通信可能な状態になっているか
    amIInitiator	: boolean,			// WebRTC の通信を行う際に，こちらから offer をするか
    isStarted		: boolean,			// WebRTC の通信がすでに始まっているか
    pc			: null | RTCPeerConnection,     // WebRTC Peer connection
}
// WebRTC 関連のデータは，`remoteStream` のみ，React の状態更新機能を用いて更新し，
// それ以外のデータは破壊的更新をする（非同期関連のバグを防ぐため）
// ただし，これが良いデザインパターンかはわからない

// カメラを共有するときのビデオと音声の設定
interface StreamConstraints {
    audio: boolean,
    video: boolean
}


