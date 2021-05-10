import { getStringFromUser, getTimeString } from '../../src/util'
import { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart } from "./client";
import { ClientState } from "./clientState";
import { ChatBoard } from "./../components/chatMessage";
import { UserInfo, UserId } from './userInfo';
import { VideoElement, VideoBoard } from "./../components/videoElement";
import * as React from 'react';
import * as ReactDOM from "react-dom";
import io from "socket.io-client";

const socket = io();

interface AppProps {
    userName: string;
    roomName: string;
}

class MainApp extends React.Component<AppProps, ClientState> {
    constructor(props: AppProps){
        super(props)
        this.state = {
            userId: null,
            roomName: props.roomName,
            userInfo: { userName: props.userName },
            localStream: null,
            remotes: new Map<UserId, Remote>(),
            localStreamConstraints: {
                audio: true,
                video: true
            },
            chats: []
        }
    }

    componentDidMount(){
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${myUerId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
                ...state,
                userId: myUserId,
                remotes: new Map([...state.remotes, ...getInitRemotes(jsonStrOtherUsers)])
            });
        });

        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
            this.setState((state) => {
                ...state,
                remotes: new Map([...state.remotes, [userId, getInitRemote(userInfo)]])
            });
        });

        const sendMessageTo =
            (toUserId: UserId?) => (message: Message) => {
                const send = () => {
                    const myUserId = this.state.userId;
                    if (myUserId === null) {
                        setTimeout(send, 500);
                        return;
                    }
                    socket.emit('message', myUserId, message, this.state.roomName, toUserId);
                }
                send();
            };


        const props = (userId: UserId): ClientProps => {
            const sendMessage = sendMessageTo(userId);

            const updateRemote = (f: (oldRemote: Remote) => Remote?) => {
                this.setState(oldState => {
                    const oldRemote = oldState.remotes.get(userId);
                    if (oldRemote === undefined) return oldState;
                    const newRemote = f(oldRemote);
                    if (newRemote === undefined)
                        return {...oldState, remote: new Map([...oldState.remotes].filter([id, _] => id !== userId)])};
                    return {...oldState, remote: new Map([...oldState.remotes, [userId, newRemote]])};
                });
            };

            const addVideoElement =
                (remoteStream: MediaStream) => {
                  updateRemote(oldRemote => {...oldRemote, remoteStream})
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
                 updateRemote(oldRemote => {...oldRemote, remoteStream: null, isStarted: false, });
                
                // remote.isStarted = false;
                // remote.pc!.close();
                // remote.pc = null;
            };

            const receiveChat = (chat: ChatMessage): void => {
                this.setState(state => {...state, chats: [...state.chats, chat]});
            };

            const block = (): void => {
                console.log('Session terminated.');
                this.state.remotes.get(userId)?.pc?.close();
                updateRemote(_ => undefined);
            }
            return { sendMessage, addVideoElement, handleRemoteHangup, hangup, block, receiveChat, updateRemote };
        }

        socket.on('message', (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') {
                console.log('Received message:', message, `from user ${userId}`);
            }
            const remote: Remote? = this.state.remotes.get(userId)!;
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
            this.setState((state) => {...state, localStream: stream});
            for (const [userId, remote] of this.state.remotes.entries()) {
                sendMessageTo(userId)({ type: 'call' });
                if (remote.isInitiator) {
                    maybeStart(remote, stream, props(userId));
                }
            }
        }

        navigator.mediaDevices.getUserMedia(this.state.localStreamConstraints)
                 .then(gotStream)
                 .catch((e) => {
                     alert(`getUserMedia() error: ${e.name}`);
                 });
        
        socket.emit('join', this.state.roomName, { userName: this.state.userName });
    }
    
    const sendChatMessage = (message: string) => {
        const chatMessage: ChatMessage = {
            userId: this.state.userId,
            time: getTimeString(),
            message: message,
        };
        sendMessageTo(undefined)({ type: "chat", chatMessage: chatMessage });
    };

    render() {
        return <div>
            <div>
                <span>{this.props.roomName}</span>
                <span>{this.props.userName}</span>
            </div>
            <div>
                <VideoElement id="localVideoElement" userId={this.state.userId ?? ""} stream={this.state.localStream} userInfo={this.state.userInfo} />
                <VideoBoard remotes={this.state.remotes} />
            </div>
            <div>
                <ChatBoard ChatMessages={this.state.chats} remtoes={this.state.remotes} />
                <ChatSender sendChatMessage={sendChatMessage} />                
            </div>
        </div>
    }
}

// Prompting for room name:
const roomName: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');

ReactDOM.render(
    <MainApp userName={userName} roomName={roomName} />,
    document.getElementById('root')
);

