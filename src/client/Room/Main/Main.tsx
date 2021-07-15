/* アプリのメイン画面
 * リファクタリング必須！！！
 */

export { Main };
import { getTimeString } from '../../../util'
import { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart } from "./ts/client";
import { ClientState, Remote } from "./ts/clientState";
import { Message } from './../../../message';
import { ChatMessage } from './../../../chatMessage';
import { ChatBoard } from "./components/ChatMessage";
import { ChatSender } from "./components/ChatSender";
import { UserInfo, UserId } from './../../../userInfo';
import { VideoElement, VideoBoard, getVideoElementProps } from "./components/VideoElement";
import { PdfHandle } from "./components/PdfHandler";
import { PDFCommandType } from './../../../PDFCommandType';
import React, { useState, useEffect } from 'react';
import * as ReactDOM from "react-dom";
import io from "socket.io-client";
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
// import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import Paper from '@material-ui/core/Paper';
import { LabelBottomNavigation } from "./components/Navigation";

const socket = io();

interface MainProps {
    userInfo: UserInfo;
    roomName: string;
}


// 自分の userId は React コンポーネントの状態とは別に管理する
// 破壊的代入を行い，更新する
let myUserId: UserId | undefined = undefined;


// メイン画面のクラス
// TODO: React.FC を使うようにしたい
const Main: React.FC<MainProps> = (mainProps: MainProps) => {

    // 自分のカメラ映像
    const [localStream, setLocalStream] = useState<null | MediaStream>(null);
    // 自分のカメラ映像の条件
    const [localStreamConstraints, setLocalStreamConstraints] = useState({
	audio: true,
	video: true
    });

    // 他の人たち
    const [remotes, setRemotes] = useState(new Map<UserId, Remote>());

    // チャット
    const [chats, setChats] = useState<ChatMessage[]>([]);


    // メッセージを送信する
    const sendMessageTo =
        (toUserId: UserId | undefined) => (message: Message) => {
	    console.log("sending", message, toUserId);
            const send = () => {
                const me = myUserId;
                if (me === null) { // myUserId が null のときは少し待ってから再トライする
                    console.log("timeout: myUserId is null");
                    setTimeout(send, 500);
                    return;
                }
                socket.emit('message', me, message, mainProps.roomName, toUserId);
            }
            send();
        };


    // 他の人にビデオ通話のお誘いをする
    const callOthers = (localStream: MediaStream, remotes: Map<UserId, Remote>) => {
	console.log("calling others");
	for (const [userId, remote] of remotes.entries()) {
	    console.log(`calling ${userId}`);
	    sendMessageTo(userId)({ type: 'call' });
	    if (remote.isInitiator) {
		maybeStart(remote, localStream, props(userId));
	    }
	}
    }


    // client.ts に渡すプロパティ．userId はこれからやりとりをする人
    const props = (userId: UserId): ClientProps => {
        const sendMessage = sendMessageTo(userId);
	
        // 受け取った関数に基づいて remote をアップデートする
	const updateRemote = (f: (oldRemote: Remote) => Remote | undefined) => {
            const oldRemote = remotes.get(userId);
            if (oldRemote === undefined) return;
            const newRemote = f(oldRemote);
            if (newRemote === undefined) {
                setRemotes(new Map([...remotes].filter(([id, _]) => id !== userId)));
            } else { 
                setRemotes(new Map([...remotes, [userId, newRemote]]));
            }
	};

	// ビデオ要素をセットする
	const addVideoElement =
	    (remoteStream: MediaStream | null) => {
		updateRemote(oldRemote => { return {...oldRemote, remoteStream}; });
            };

	// 通話を切る
        const hangup = () => {
            console.log('Hanging up.');
            stopVideo();
            sendMessage({ type: 'bye' });
        };

	// 相手がビデオ通話を切ったとき
        const handleRemoteHangup = (): void => stopVideo();

	// 相手のビデオを止める
        const stopVideo = (): void => {
            updateRemote(oldRemote => { return {...oldRemote, remoteStream: null, isStarted: false }});
            
            // remote.isStarted = false;
            // remote.pc!.close();
            // remote.pc = null;
        };

	// チャットを受信する
        const receiveChat = (chat: ChatMessage): void => setChats([...chats, chat]);

	// 相手との通信を完全に遮断するとき
        const block = (): void => {
            console.log('Session terminated.');
            remotes.get(userId)?.pc?.close();
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


    // このコンポーネントがマウントされた最初にだけ実行される関数
    useEffect(() => {
	console.log("componentdidMount");
	// 自分が部屋に入れたという返答をサーバからもらった場合
	socket.on('joined', (userId: UserId, jsonStrOtherUsers: string) => {
	    myUserId = userId;
            console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);
	    const newRemotes = new Map<UserId, Remote>([...remotes, ...getInitRemotes(jsonStrOtherUsers)])
	    setRemotes(newRemotes);

	    // 自分のカメラ映像が取れているなら他の人にビデオ通話のお誘いをする
	    if (localStream) callOthers(localStream, newRemotes);
	    console.log("remotes", newRemotes);
        });

	// 他の人が部屋に入ってきた場合
        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
	    setRemotes(new Map([...remotes, [userId, getInitRemote(userInfo)]]));
        });

	// 他の人から新しいメッセージを受信した場合
        socket.on('message', (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') {
		// candidate のメッセージは多すぎるけど，それ以外ならプリントデバッグ用に表示
                console.log('Received message:', message, `from user ${userId}`);
            }
            const remote = remotes.get(userId);
            if (remote === undefined) { // とりあえずは，自分の知らない人からのメッセージだったらエラーにしちゃった
                throw Error(`remote is null for ${userId}`);
            }
            handleMessage(remote, message, localStream, props(userId));
        });
        

        console.log("ここから，自分のビデオ（localStream）を探す旅に出る");

	// If found local stream
        const gotStream = (stream: MediaStream): void => {
            console.log('Adding local stream and call others');
	    setLocalStream(stream);
	    callOthers(stream, remotes);
	    console.log("remotes", remotes);
        }

	// 自分のビデオが見つかったら gotStream 関数に渡して実行する
        navigator.mediaDevices.getUserMedia(localStreamConstraints)
                 .then(gotStream)
                 .catch((e) => alert(`getUserMedia() error: ${e.name}`));
        
	// 部屋に入る旨をサーバへ送信する
        socket.emit('join', mainProps.roomName, mainProps.userInfo);
    }, []);

    
    const sendChatMessage = (message: string) => {
        const chatMessage: ChatMessage = { // 新しいチャットのメッセージ
            userId: myUserId ?? "undefined",
            time: getTimeString(),
            message: message,
        };
	setChats([...chats, chatMessage]); // 自分の手元にも追加
	sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage }); // チャットをブロードキャストする
    };

    const sendPDFCommand = (com: PDFCommandType) => {
        const message: Message = {type: "pdfcommand", command: com};
        sendMessageTo(undefined)(message);
    }

    const wholeBoxStyle = {
        component: "div",
        height: "100vh",
        display: "block",
        position: "relative",
        overflow: "hidden",
    }
    
    return (
        //	    <Grid container justify="center" >
        //画面全体を囲むためのBox
	<Box
	    height="100vh"
	    width="100vw"
	    position="relative"
	    overflow="hidden"
	>

	    {/* チャットとビデオの要素を囲むBox */}
	    <Box
		display="block"
		position="relative"
		margin="10px 10px 0px"
		overflow="hidden"
		top="0"
		style={{height:'calc(100vh - 70px)'}}
	    >
		<Box
		    component="div"
		    height="100%"
		    left="0"
		    position="absolute"
		    zIndex="tooltip"
		    maxWidth="100%"
		    style={{overflowY: 'scroll', overflowX: 'hidden'}}
		    padding="5"
		>
		    <ChatBoard chatMessages={chats} remotes={remotes} myInfo={mainProps.userInfo}/>
		    <ChatSender sendChatMessage={sendChatMessage} />                
		</Box>
		<Box
		    height="100%"
		    overflow="auto"
		>
		    <VideoBoard videoElements={getVideoElementProps(myUserId ?? "undefined", localStream, mainProps.userInfo, remotes)} />
		</Box>
	    </Box>
	    <Box
		component="div"
		height="100%"
		position="absolute"
		top="0"
		right="0"
p		overflow="auto"
	    >
		<PdfHandle sendPDFCommand={sendPDFCommand}/>
	    </Box>
	    <Box bottom="0" position="fixed" width="100%" height="60px">
		<LabelBottomNavigation />
	    </Box>
	</Box>
	//	    </Grid>
    );
}

