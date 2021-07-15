export { Main };
import { getTimeString } from '../../util'
import { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart } from "./../ts/client";
import { ClientState, Remote } from "./../ts/clientState";
import { Message } from './../../message';
import { ChatMessage } from './../../chatMessage';
import { ChatBoard } from "./../components/chatMessage";
import { ChatSender } from "./../components/chatSender";
import { UserInfo, UserId } from './../../userInfo';
import { VideoElement, VideoBoard } from "./../components/videoElement";
import * as React from 'react';
import * as ReactDOM from "react-dom";
import io from "socket.io-client";
import Button from '@material-ui/core/Button';
import Grid from '@material-ui/core/Grid';
// import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import { LabelBottomNavigation } from "./../components/Navigation"
import { PdfHandle } from "./PdfHandler";
import { PDFCommandType } from '../../PDFCommandType';


const socket = io();

interface MainProps {
    userInfo: UserInfo;
    roomName: string;
}

class Main extends React.Component<MainProps, ClientState> {
    sendMessageTo: (toUserId: UserId | undefined) => (message: Message) => void;
    constructor(props: MainProps){
        super(props)
        this.state = {
            userId: null,
            roomName: props.roomName,
            userInfo: props.userInfo,
            localStream: null,
            remotes: new Map<UserId, Remote>(),
            localStreamConstraints: {
                audio: true,
                video: true
            },
            chats: []
        }
        this.sendMessageTo =
            (toUserId: UserId | undefined) => (message: Message) => {
                const send = () => {
                    const [myUserId, roomName] = [this.state.userId, this.state.roomName];
                    if (myUserId === undefined || roomName === undefined) throw Error("myUserId  or roomName is undefined");
                    if (myUserId === null || roomName === null) {
                        console.log("timeout: myUserId  or roomName is null");
                        setTimeout(send, 500);
                        return;
                    }
                    socket.emit('message', myUserId, message, roomName, toUserId);
                }
                send();
            };
        this.sendChatMessage = this.sendChatMessage.bind(this);
        this.sendPDFCommand = this.sendPDFCommand.bind(this);
    }

    componentDidMount(){
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

        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
            this.setState((state) => {
                return {
                    ...state,
                    remotes: new Map([...state.remotes, [userId, getInitRemote(userInfo)]])
                };
            });
        });

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

        socket.on('message', (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') {
                console.log('Received message:', message, `from user ${userId}`);
            }
            const remote: Remote | undefined = this.state.remotes.get(userId)!;
            if (remote === undefined) {
                throw Error(`remote is null for ${userId}`);
            }
            handleMessage(remote, message, this.state.localStream, props(userId));
        });
        

        console.log("Going to find Local media");
        // console.log('Getting user media with constraints', clientState.localStreamConstraints);

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

        navigator.mediaDevices.getUserMedia(this.state.localStreamConstraints)
                 .then(gotStream)
                 .catch((e) => {
                     alert(`getUserMedia() error: ${e.name}`);
                 });
        
        socket.emit('join', this.state.roomName, this.state.userInfo);
    }
    
    sendChatMessage (message: string){
        this.setState(state => {
            console.log("this.state", state);
            const chatMessage: ChatMessage = {
                userId: state.userId ?? "undefined",
                time: getTimeString(),
                message: message,
            };
            this.sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage });
            return { ...state, chats: [...state.chats, chatMessage]};
        });
    };

    sendPDFCommand (com: PDFCommandType){
        const message: Message = {type: "pdfcommand", command: com};
        this.sendMessageTo(undefined)(message);
        return;
    }

    render() {
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
            component={"div"}
            height="100vh"
            display="block"
            position="relative"
            overflow="hidden"
	    >
            {/* ヘッダー情報: 部屋名+ユーザーネーム */}
            <Box className="header" top="0" position="fixed" width="100%">
                <span className="room-name">{this.props.roomName}</span>
                <span className="user-name">{this.props.userInfo.userName}</span>
            </Box>
            {/* チャットとビデオの要素を囲むBox */}
            <Box
                component="div"
                // height="100%"
                display="block"
                width="100%"
                position="relative"
                margin="0"
                overflow="hidden"
                top="30px"
                style={{height:'calc(100% - 120px)'}}
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
                    <ChatBoard chatMessages={this.state.chats} remotes={this.state.remotes} myInfo={this.state.userInfo}/>
                    <ChatSender sendChatMessage={this.sendChatMessage} />                
                </Box>
                <Box
                    height="100%"
                    overflow="auto"
                >
                    <div id="local-video">
                        <VideoElement userId={this.state.userId ?? ""} stream={this.state.localStream} userInfo={this.state.userInfo} />
                    </div>
                    <VideoBoard remotes={this.state.remotes} />
                </Box>
            </Box>
            <Box
                component="div"
                height="100%"
                position="absolute"
                top="0"
                right="0"
                overflow="auto"
            >
                <PdfHandle sendPDFCommand={this.sendPDFCommand}/>
            </Box>
            <Box bottom="0" position="fixed" width="100%">
                <LabelBottomNavigation />
            </Box>
	    </Box>
	    //	    </Grid>
	    );
    }
}

