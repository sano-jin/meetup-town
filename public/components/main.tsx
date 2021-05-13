export { Main };
import { getStringFromUser, getTimeString } from '../../src/util'
import { getInitRemotes, getInitRemote, handleMessage, ClientProps, maybeStart } from "./../ts/client";
import { ClientState, Remote } from "./../ts/clientState";
import { Message } from './../ts/message';
import { ChatMessage } from './../ts/chatMessage';
import { ChatBoard } from "./../components/chatMessage";
import { ChatSender } from "./../components/chatSender";
import { UserInfo, UserId } from './../ts/userInfo';
import { VideoElement, VideoBoard } from "./../components/videoElement";
import * as React from 'react';
import * as ReactDOM from "react-dom";
import io from "socket.io-client";

const socket = io();

interface MainProps {
    userName: string;
    roomName: string;
}

class Main extends React.Component<MainProps, ClientState> {
    sendMessageTo: (toUserId: UserId | undefined) => (message: Message) => void;
    constructor(props: MainProps){
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
        this.sendMessageTo =
            (toUserId: UserId | undefined) => (message: Message) => {
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
      this.sendChatMessage = this.sendChatMessage.bind(this);
    }

    componentDidMount(){
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${myUserId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
                return {
                    ...state,
                    userId: myUserId,
                    remotes: new Map([...state.remotes, ...getInitRemotes(jsonStrOtherUsers)])
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
            for (const [userId, remote] of this.state.remotes.entries()) {
                this.sendMessageTo(userId)({ type: 'call' });
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

    render() {
        return <div>
            <div className="header">
                <span className="room-name">{this.props.roomName}</span>
                <span className="user-name">{this.props.userName}</span>
            </div>
            <div>
                <div id="local-video">
                    <VideoElement userId={this.state.userId ?? ""} stream={this.state.localStream} userInfo={this.state.userInfo} />
                </div>
                <VideoBoard remotes={this.state.remotes} />
            </div>
            <div>
                <ChatBoard chatMessages={this.state.chats} remotes={this.state.remotes} myInfo={this.state.userInfo}/>
                <ChatSender sendChatMessage={this.sendChatMessage} />                
            </div>
        </div>
    }
}

/*

// Prompting for room name:
const roomName: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');

ReactDOM.render(
    <Main userName={userName} roomName={roomName} />,
    document.getElementById('root')
);

*/
