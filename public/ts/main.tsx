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
        socket.on('joined', (userId: UserId, jsonStrOtherUsers: string) => {
            console.log(`me ${userId} joined with`, jsonStrOtherUsers);
            this.setState((state) => {
                ...state,
                userId: userId,
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

        
        
        
        socket.on('chatMessage',(obj) => {
            //WebSocketサーバーからchatMessageを受け取った際の処理
            const logs2 = this.state.logs
            //logs2に今までのlogを格納する
            obj.key = 'key_' + (this.state.logs.length + 1)
            //メッセージ毎に独自のキーを設定して判別できるようにする
            console.log(obj)
            //consolelogにobj.key、name、messageを表示する
            logs2.unshift(obj)
            //配列の一番最初に最新のメッセージを入れる。
            //そうすることで新しいメッセージほど上に表示されるようになる
            this.setState({logs: logs2})
            //最新のkey、name、messageが入ったlogs2をlogsに入れる。
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

