////////////////////////////////////////////////////////////////////////////////
//
// クライアントサイドの状態の型
//
////////////////////////////////////////////////////////////////////////////////



export { ClientState, Remote };

// サーバと共有する情報の型
import { UserInfo, UserId }	from './../../../../userInfo';
import { ChatMessage }		from './../../../../chatMessage';


// クライアントサイドの状態
interface ClientState {
    userId			: null | UserId,        // 初期状態で userId は null．部屋に初めて join したときのサーバの返答から取得する                        
    roomName			: string;               // わざわざ「状態」として「部屋の名前」を持つ必要はあるだろうか？なさげ？
    userInfo			: UserInfo,
    localStream			: null | MediaStream,	// 自分のカメラ映像
    remotes			: Map<string, Remote>,  // 他のユーザの情報
    localStreamConstraints	: StreamConstraints,    // 自分のカメラ映像の設定
    chats			: ChatMessage[],        // チャットメッセージのリスト                        
}

// 他のユーザの情報
interface Remote {
    userInfo		: UserInfo,			// Information of the user
    isChannelReady	: boolean,			// channel ready 
    isInitiator		: boolean,			// Am I a initiator
    isStarted		: boolean,			// Has started or not
    pc			: null | RTCPeerConnection,     // Peer connection
    remoteStream	: null | MediaStream,		// Remote camera
}

// カメラを共有するときのビデオと音声の設定
interface StreamConstraints {
    audio: boolean,
    video: boolean
}


