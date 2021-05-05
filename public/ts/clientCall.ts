/** 
 * An auxiliary functions for 'client'
 */
export {
    getLocalStream,
    maybeStart,
}

import { turnConfig } from './config';
import { sendMessage } from './clientMessage';
import { UserId } from './userInfo';
import { waitNonNull } from '../../src/util'
import { ClientState, Remote } from './clientState'

// Initialize turn/stun server here
const pcConfig = turnConfig;

// Displaying Local Stream and Remote Stream on webpage
const remoteVideos = document.querySelector<HTMLUListElement>('#remotes')!;


// If found local stream
const callOthers =
    async (clientState: ClientState): Promise<void> => {
        // wait the clientState.userId to be non-null.
        await waitNonNull<string>(() => clientState.userId);
        for (const [userId, remote] of clientState.remotes.entries()) {
            sendMessage(clientState)({ type: 'got user media' }, userId);
            if (remote.isInitiator) {
                maybeStart(clientState, userId);
            }
        }
    };

const setStream =
    (clientState: ClientState, localVideo: HTMLVideoElement) =>
        (stream: MediaStream): void => {
            console.log('Adding local stream.');
            clientState.localStream = stream;
            localVideo.srcObject = stream;
        };

const getLocalStream =
    async (clientState: ClientState, localVideo: HTMLVideoElement) => {
        await navigator.mediaDevices.getUserMedia(clientState.localStreamConstraints)
            .then(setStream(clientState, localVideo))
            .catch(e => alert(`getUserMedia() error: ${e.name}`));
        callOthers(clientState);
    }

// If initiator, create the peer connection
const maybeStart =
    async (clientState: ClientState, toUserId: UserId): Promise<void> => {
        const remote: Remote = clientState.remotes.get(toUserId)!;
        console.log(
            '>>>>>>> maybeStart() ',
            toUserId,
            remote.isStarted,
            clientState.localStream,
            remote.isChannelReady
        );
        if (!remote.isStarted
            && clientState.localStream !== null
            && remote.isChannelReady) {
            console.log('>>>>>> creating peer connection', toUserId);
            remote.pc = createPeerConnection(clientState, toUserId);
            if (remote.pc === null) throw Error(`Peer connection to ${toUserId} is null`);
            const localStream = await waitNonNull<MediaStream>(() => clientState.localStream);
            clientState.localStream
                .getTracks()
                .forEach(track => remote.pc!.addTrack(track, localStream));
            remote.isStarted = true;
        }
    };

// Creating peer connection
const createPeerConnection =
    (clientState: ClientState, toUserId: UserId): RTCPeerConnection | null => {
        try {
            const pc = new RTCPeerConnection(pcConfig);
            pc.onicecandidate = handleIceCandidate(clientState, toUserId);
            pc.ontrack = handleRemoteStream(clientState, toUserId);
            pc.onnegotiationneeded =
                handleNegotiationNeededEvent(clientState, pc, toUserId);
            // pc.onremovestream = handleRemoteStreamRemoved;
            // Somehow deprecated ...
            console.log('Created RTCPeerConnnection');
            return pc;
        } catch (e) {
            console.log(`Failed to create PeerConnection, exception: ${e.message}`);
            alert('Cannot create RTCPeerConnection object.');
            return null;
        }
    }

const handleNegotiationNeededEvent =
    (clientState: ClientState, pc: RTCPeerConnection, toUserId: UserId) =>
        async (): Promise<void> => {
            console.log(`handleNegotiationNeededEvent`, toUserId);
            const sessionDescription = await pc.createOffer();
            if (clientState.remotes.get(toUserId)!.isInitiator) {
                await pc.setLocalDescription(sessionDescription)
                    .catch(e => console.log(e));
                sendMessage(clientState)(sessionDescription, toUserId);
            }
        };


// to handle Ice candidates
const handleIceCandidate =
    (clientState: ClientState, toUserId: UserId) =>
        (event: RTCPeerConnectionIceEvent): void => {
            // console.log('icecandidate event: ', event);
            if (event.candidate) {
                sendMessage(clientState)({
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                }, toUserId);
            } else {
                console.log('End of candidates.');
            }
        }


const handleRemoteStream =
    (clientState: ClientState, toUserId: string) =>
        (event: RTCTrackEvent): void => {
            if (event.streams.length >= 1) {
                console.log(`Remote stream of toUserId ${toUserId} added.`);
                clientState.remotes.get(toUserId)!.remoteStream = event.streams[0];
            } else {
                console.log(`Remote stream of toUserId ${toUserId} removed.`);
                clientState.remotes.get(toUserId)!.remoteStream = null;
            }
            console.log("clientState.remotes", clientState.remotes);

            // TODO: Replace these with React or something ...
            remoteVideos.textContent = null;

            for (const [userId, remote] of clientState.remotes) {
                console.log(`remote.remoteStream of user ${userId}`, remote.remoteStream);
                if (remote.remoteStream === null) {
                    console.log(`remoteStream of user ${userId} is null`);
                    continue;
                }
                console.log(`adding ${userId} of ${remote.remoteStream!.id}`);
                const item = document.createElement("li");
                item.className = `remote_div username_${userId}`;
                const videoElement = document.createElement("video")
                videoElement.srcObject = remote.remoteStream;
                videoElement.autoplay = true;
                videoElement.playsInline = true;
                item.appendChild(videoElement);
                remoteVideos.appendChild(item);
            }
        }
