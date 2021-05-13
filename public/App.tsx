import { Main } from "./components/main";
import { getStringFromUser, getTimeString } from '../src/util'
import * as React from 'react';
import * as ReactDOM from "react-dom";


// Prompting for room name:
const roomName: string = getStringFromUser('Enter room name:');
const userName: string = getStringFromUser('Enter your name:');

ReactDOM.render(
    <Main userName={userName} roomName={roomName} />,
    document.getElementById('root')
);

