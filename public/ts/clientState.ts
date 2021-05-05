export { ClientState, Remote };
import { UserInfo, UserId } from './userInfo';

// Defining some global utility variables
interface ClientState {
    userId: null | UserId,
    socket: SocketIOClient.Socket,
    roomName: string,
    userInfo: UserInfo,
    localStream: null | MediaStream,       // Local camera
    remotes: Map<string, Remote>,      // A map from socket.id
    localStreamConstraints: StreamConstraints,
}

interface Remote {
    userInfo: UserInfo,                 // Information of the user
    isChannelReady: boolean,                  // Is channel ready 
    isInitiator: boolean,                  // Am I a initiator
    isStarted: boolean,                  // Has started ???
    pc: null | RTCPeerConnection, // Peer connection
    remoteStream: null | MediaStream        // Remote camera
}

interface StreamConstraints {
    audio: boolean,
    video: boolean
}

