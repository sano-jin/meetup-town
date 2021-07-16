/* クライアントサイドの状態を管理するだけのクラス
 * アプリのメイン画面は UI.tsx に移植した
 * リファクタリング必須！！！
 * 余計なインポートとかがあったら消してくれ
 */


export { Main };

import { getTimeString } from '../../../util'

// サーバとの通信
import { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart } from "./ts/client";
import io from "socket.io-client";

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, Remote }	from "./ts/clientState";
import { Message }		from './../../../message';
import { ChatMessage }		from './../../../chatMessage';
import { UserInfo, UserId }	from './../../../userInfo';
import { PDFCommandType }	from './../../../PDFCommandType';

// React
import * as React from 'react';

// メイン画面のコンポーネント
import { UI } from "./UI"



const socket = io();

interface MainProps {
    userInfo: UserInfo;
    roomName: string;
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
            userId: null,
            roomName: props.roomName, // わざわざ「状態」として「部屋の名前」を持つ必要はあるだろうか？なさげ？
            userInfo: props.userInfo,
            localStream: null,
            remotes: new Map<UserId, Remote>(),
            localStreamConstraints: {
                audio: true,
                video: true
            },
            chats: []
        }

	// toUserId にサーバを介してメッセージを送信する
	// toUserId が undefined だった場合は，ブロードキャストする
        this.sendMessageTo =
            (toUserId: UserId | undefined) => (message: Message) => {
                const send = () => {
                    const myUserId = this.state.userId;
                    if (myUserId === null) {
                        console.log("timeout: myUserId  or roomName is null");
                        setTimeout(send, 500);
                        return;
                    }
                    socket.emit('message', myUserId, message, this.props.roomName, toUserId);
                }
                send();
            };
	// おまじない（なんで必要なのかはよくわからない）
        this.sendChatMessage = this.sendChatMessage.bind(this);
        this.sendPDFCommand = this.sendPDFCommand.bind(this);
    }

    // このコンポーネントが初めて読み込まれたときに一回実行する関数
    componentDidMount(){
	// 自分が部屋に入ったとサーバから返事が返ってきた場合
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
		const remotes =  new Map<UserId, Remote>([...state.remotes, ...getInitRemotes(jsonStrOtherUsers)]);
		if (state.localStream) {
		    console.log("found localStream before getting back the answer of the join message");
		    for (const [userId, remote] of remotes.entries()) {
			console.log(`calling ${userId}`);
			this.sendMessageTo(userId)({ type: 'call' });
			if (remote.isInitiator) {
			    maybeStart(remote, state.localStream, props(userId));
			}
		    }
		}
                return {
                    ...state,
                    userId: myUserId,
                    remotes: remotes
                };
            });
        });

	// 他の人が入ってきた場合
        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
            this.setState((state) => {
                return {
                    ...state,
                    remotes: new Map([...state.remotes, [userId, getInitRemote(userInfo)]])
                };
            });
        });

	// サーバとのやりとりに必要な関数を渡すための下準備
        const props = (userId: UserId): ClientProps => {
            const sendMessage = this.sendMessageTo(userId);

            const updateRemote = (f: (oldRemote: Remote) => Remote | undefined) => {
                this.setState((oldState: ClientState) => {
                    const oldRemote = oldState.remotes.get(userId);
                    if (oldRemote === undefined) return oldState;
                    const newRemote = f(oldRemote);
                    if (newRemote === undefined) {
                        return {
                            ...oldState,
                            remotes: new Map([...oldState.remotes]
                                .filter(([id, _]) => id !== userId)
                            )
                        };
                    } else { 
                        return {...oldState, remotes: new Map([...oldState.remotes, [userId, newRemote]])};
                    }
                });
            };

            const addVideoElement =
                (remoteStream: MediaStream | null) => {
                    updateRemote(oldRemote => { return {...oldRemote, remoteStream}; });
                };


            const hangup = () => {
                console.log('Hanging up.');
                stopVideo();
                sendMessage({ type: 'bye' });
            };

            const handleRemoteHangup = (): void => {
                stopVideo();
            };

            const stopVideo = (): void => {
                updateRemote(oldRemote => { return {...oldRemote, remoteStream: null, isStarted: false }});
                
                // remote.isStarted = false;
                // remote.pc!.close();
                // remote.pc = null;
            };

            const receiveChat = (chat: ChatMessage): void => {
                this.setState(state => { return {...state, chats: [...state.chats, chat]}; });
            };

            const block = (): void => {
                console.log('Session terminated.');
                this.state.remotes.get(userId)?.pc?.close();
                updateRemote(_ => undefined);
            }
            return {
                sendMessage,
                addVideoElement,
                handleRemoteHangup,
                hangup,
                block,
                receiveChat,
                updateRemote
            };
        }

	// サーバからメッセージを受信した
        socket.on('message', (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') { // candidate は回数が多いのでそれ以外ならデバッグ用に表示
                console.log('Received message:', message, `from user ${userId}`);
            }
            const remote: Remote | undefined = this.state.remotes.get(userId)!;
            if (remote === undefined) { // とりあえずは，知らない人からメッセージが来たらエラーを吐くことにした
                throw Error(`remote is null for ${userId}`);
            }
            handleMessage(remote, message, this.state.localStream, props(userId));
        });
        

        console.log("Going to find Local media");

	// If found local stream
        const gotStream = (stream: MediaStream): void => {
            console.log('Adding local stream.');
            this.setState((state) => { return {...state, localStream: stream}; });
	    console.log('set state: added my local stream. Calling others (if there)');
            for (const [userId, remote] of this.state.remotes.entries()) {
		console.log(`calling ${userId}`);
                this.sendMessageTo(userId)({ type: 'call' });
                if (remote.isInitiator) {
                    maybeStart(remote, stream, props(userId));
                }
            }
	    console.log("Called others", this.state.remotes)
        }

	// もし自分のカメラ映像を見つけられたら gotStream 関数を実行する
        navigator.mediaDevices.getUserMedia(this.state.localStreamConstraints)
                 .then(gotStream)
                 .catch((e) => {
                     alert(`getUserMedia() error: ${e.name}`);
                 });

        // サーバに部屋に入りたい旨を通知
        socket.emit('join', this.props.roomName, this.state.userInfo);
    }

    // チャットメッセージを送信する
    sendChatMessage (message: string){
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

    sendPDFCommand (com: PDFCommandType){
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

