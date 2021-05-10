import { getStringFromUser } from '../../src/util'
import * as client from "./client";
import { ClientState } from "./clientState";
import { chatBoard } from "./../components/chatMessage";
import * as React from 'react';
import * as ReactDOM from "react-dom";

client;

type Props {
    userName: string;
    userRoom: string;
}

class App extends React.Component<Props, ClientState> {
    constructor(props){
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
        const socket = io();
        socket.on('joined', (myUserId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${myUerId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
                ...state,
                userId: myUserId,
                remotes: new Map([...state.remotes, ...client.getInitRemotes(jsonStrOtherUsers)])
            });
        });

        socket.on('anotherJoin', (userId: UserId, userInfo: UserInfo) => {
            console.log(`Another user ${userId} has joined to our room`, userInfo);
            this.setState((state) => {
                ...state,
                remotes: new Map([...state.remotes, [userId, client.getInitRemote(userInfo)]])
            });
        });

        const sendMessageTo =
            (toUserId: UserId) => (message: Message) => {
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


        const props = (userId: UserId) => {
            const sendMessage = sendMessageTo(userId);
            const addVideoElement =
                (remoteStream: MediaStream) => {
                    console.log(remoteStream);
                };

            const hangup = () => {
                console.log('Hanging up.');
                if (remote === undefined || remote === null) {
                    throw Error(`trying to hanging up the unknown user ${toUserId}`);
                }
                stop();
                sendMessage({ type: 'bye' });

                // remote.remoteStream = null;

            };

            const handleRemoteHangup = (): void => {
                console.log('Session terminated.');
                stop();
                // remote.isInitiator = false;
                // remote.remoteVideoElement!.remove(); // hide remote video
                // clientState.remotes.delete(toUserId);
            };

            const stop = (): void => {
                // remote.isStarted = false;
                // remote.pc!.close();
                // remote.pc = null;
            };



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
            this.setState(state => {...state, localStream: stream});
            for (const [userId, remote] of this.state.remotes.entries()) {
                sendMessageTo(userId)({ type: 'call' });
                if (remote.isInitiator) {
                    maybeStart(remote, stream, props(userId));
                }
            }
        }

        navigator.mediaDevices.getUserMedia(clientState.localStreamConstraints)
                 .then(gotStream)
                 .catch((e) => {
                     alert(`getUserMedia() error: ${e.name}`);
                 });
        
        socket.emit('join', this.state.roomName, { userName: this.state.userName });
    }
    
    
    render() {
        return <div>
            <div>
                <span>{this.props.roomName}</span>
                <span>{this.props.userName}</span>
            </div>
        </div>
    }
}

// Prompting for room name:
const roomName: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');

ReactDOM.render(
    <App userName={userName} roomName={roomName} />,
    document.getElementById('root')
);

/*
   type Props = {
   name: string;
   };

   type State = {
   clientState: ClientState;
   userName: string;
   roomName: string;
   };

   class Welcome extends React.Component<Props, State> {
   constructor(props: Props) {
   super(props);
   this.state = {
   clientState: client.clientState,
   userName: client.userName,
   roomName: client.roomName
   };
   }
   
   render() {
   return <div>
   <span>{this.state.roomName}</span>
   <span>{this.state.userName}</span>
   </div>
   }
   }

 */

