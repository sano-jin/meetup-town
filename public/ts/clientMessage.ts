export { Message, sendMessage };
// import * as io from "socket.io-client";
import { UserId } from './userInfo';
import { waitNonNull } from '../../src/util'
import { ClientState } from './clientState'


interface Candidate {
    type: 'candidate',
    label: RTCIceCandidate["sdpMLineIndex"],
    id: RTCIceCandidate["sdpMid"],
    candidate: RTCIceCandidate["candidate"],
}

interface Bye {
    type: "bye",
}

interface GotUserMedia {
    type: "got user media",
}

type Message = Candidate | Bye | GotUserMedia | RTCSessionDescriptionInit;


// to send message in a room
const sendMessage =
    (clientState: ClientState) =>
        async (message: Message, toUserId?: UserId): Promise<void> => {
            const myUserId = await waitNonNull<string>(() => clientState.userId)!;
            // console.log('Client sending message: ', message, toRoom, toUserId);
            clientState.socket.emit('message', myUserId, message, clientState.roomName, toUserId);
        };


