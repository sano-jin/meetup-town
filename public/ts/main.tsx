import * as client from "./client";
import { ClientState } from "./clientState";
import * as reactTest from "./reactTest";
import * as React from 'react';
import * as ReactDOM from "react-dom";

client;
reactTest;

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

const name = 'Josh Perez';
const element = <Welcome name={name} />;


ReactDOM.render(
    element,
    document.getElementById('root')
);
