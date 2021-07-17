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


export { Main };


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


interface MainProps {
    userInfo: UserInfo;
    roomId: string;
}


// メインの状態を管理するだけのクラス
// React.FC を使うようにしたいと思ったが，ここに関してだけはそう簡単にもいかなさそう
// socket.on イベントリスナで状態を更新したいのだが，現状これがうまくできない．．．
// イベントハンドラ登録時の状態と，最新の状態が異なる（可能性がある）ため
class Main extends React.Component<MainProps, ClientState> {
    sendMessageTo: (toUserId: UserId | undefined) => (message: Message) => void;
    constructor(props: MainProps){
        super(props)
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

	// toUserId にサーバを介してメッセージを送信する
	// toUserId が undefined だった場合は，ブロードキャストする
        this.sendMessageTo =
            (toUserId: UserId | undefined) => (message: Message) => {
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
    }

    // このコンポーネントが初めて読み込まれたときに一回実行する関数
    componentDidMount(){
	// 自分が部屋に入ったとサーバから返事が返ってきた場合
	// 自分の userId と先に部屋にいた人たちの情報をサーバに返してもらう
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
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
            });
        });

	// 他の人が入ってきた場合
        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
            this.setState((state) => {
                return {
                    ...state,
                    remoteUsers: new Map([...state.remoteUsers, [userId, getInitRemoteUser(userInfo)]])
                };
            });
        });

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

	// サーバからメッセージを受信した
        socket.on('message', (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') { // candidate は回数が多いのでそれ以外ならデバッグ用に表示
                console.log('Received message:', message, `from user ${userId}`);
            }
            const remoteUser: RemoteUser | undefined = this.state.remoteUsers.get(userId)!;
            if (remoteUser === undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
                throw Error(`remoteUser is null for ${userId}`);
            }
            handleMessage(remoteUser, message, this.state.localStream, props(userId));
        });
        

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

        // サーバに部屋に入りたい旨を通知
        socket.emit('join', this.props.roomId, this.state.userInfo);
    }

    // チャットメッセージを送信する
    sendChatMessage = (message: string) => {
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

    sendPDFCommand = (com: PDFCommandType) => {
        const message: Message = {type: "pdfcommand", command: com};
        this.sendMessageTo(undefined)(message);
    }

    render() {
	return (<UI clientState={this.state}
		    sendChatMessage={this.sendChatMessage}
		    sendPDFCommand={this.sendPDFCommand}
	/>);
    }
}

