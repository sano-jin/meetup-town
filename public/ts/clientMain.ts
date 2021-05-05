/** 
 * An auxiliary functions for 'client'
 */
export {
    onMessage,
    getLocalStream,
}

import { Message, sendMessage } from './clientMessage';
import { getLocalStream, maybeStart } from './clientCall';
import { UserId } from './userInfo';
import { waitNonNull } from '../../src/util'
import { ClientState, Remote } from './clientState'


// Displaying Local Stream and Remote Stream on webpage
// const localVideo = document.querySelector<HTMLVideoElement>('#localVideo')!;


// Initializing socket.io
// const socket = io();

// Prompting for room name:
// const roomName: string = getStringFromUser('Enter room name:');
// const userName: string = getStringFromUser('Enter your name:');

const onMessage =
    (clientState: ClientState) =>
        async (userId: UserId, message: Message) => {
            if (message.type !== 'candidate') {
                console.log('Client received message:', message, `from user ${userId}`);
            }
            if (!clientState.remotes.has(userId)) {
                throw Error(`remote is null for ${userId}`);
            }
            const remote: Remote =
                await waitNonNull<Remote>(() => clientState.remotes.get(userId));
            switch (message.type) {
                case 'got user media':
                    maybeStart(clientState, userId);
                    break;
                case 'bye':
                    if (remote.isStarted) {
                        // handleRemoteHangup(userId);
                    }
                    break;
                default:
                    handleRTCMessage(clientState, remote, userId, message);
            }
        };


const handleRTCMessage =
    async (clientState: ClientState, remote: Remote, userId: UserId, message: Message) => {
        const pc = await waitNonNull<RTCPeerConnection>(() => remote.pc);
        switch (message.type) {
            case 'offer':
                if (!remote.isInitiator && !remote.isStarted) {
                    console.log(`starting communication with ${userId} with an offer`);
                    maybeStart(clientState, userId);
                }
                await pc.setRemoteDescription(message)
                    .catch(console.log);
                doAnswer(clientState, pc, userId);
                break;
            case 'answer':
                if (remote.isStarted) {
                    pc.setRemoteDescription(message)
                        .catch(console.log);
                }
                break;
            case 'candidate':
                if (remote.isStarted) {
                    const candidate = new RTCIceCandidate({
                        sdpMLineIndex: message.label,
                        candidate: message.candidate
                    });
                    pc.addIceCandidate(candidate);
                }
                break;
            default:
                throw Error(`received message has unknown type ${message.type}`)
        }
    };



const doAnswer =
    (clientState: ClientState, pc: RTCPeerConnection, toUserId: UserId): void => {
        console.log(`Sending answer to peer ${toUserId}`);
        pc.createAnswer()
            .then(setLocalAndSendMessage(clientState, pc, toUserId))
    }

const setLocalAndSendMessage =
    (clientState: ClientState, pc: RTCPeerConnection, toUserId: UserId) =>
        async (sessionDescription: RTCSessionDescriptionInit): Promise<void> => {
            await pc.setLocalDescription(sessionDescription)
                .catch(console.trace);

            console.log(`setLocalAndSendMessage sending message to ${toUserId}`, sessionDescription);
            sendMessage(clientState)(sessionDescription, toUserId);
        }




/*
Based on the deprected implementation of RTCPeerConnection.
const handleRemoteStreamRemoved(event: MediaStreamEvent) => {
    console.log('Remote stream removed. Event: ', event);
}
*/

/*
const hangup(): void => {
    console.log('Hanging up.');
    stop();
    sendMessage({type: 'bye'}, room);
    remoteVideo.srcObject = null; // hide remote video
}

const handleRemoteHangup(): void => {
    console.log('Session terminated.');
    stop();
    clientState.isInitiator = false;
    remoteVideo.srcObject = null; // hide remote video
}

const stop(): void => {
    clientState.isStarted = false;
    pc.close();
//     pc = null;
}

*/
