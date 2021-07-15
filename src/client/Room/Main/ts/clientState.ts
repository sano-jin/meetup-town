export { ClientState, Remote };
import { UserInfo, UserId } from './../../../../userInfo';
import { ChatMessage } from './../../../../chatMessage';

// Defining some global utility variables
interface ClientState {
    userId: null | UserId,
    roomName: string;
    userInfo: UserInfo,
    localStream: null | MediaStream,  // Local camera
    remotes: Map<string, Remote>,     // A map from socket.id
    localStreamConstraints: StreamConstraints,
    chats: ChatMessage[],
}

interface Remote {
    userInfo: UserInfo,               // Information of the user
    isChannelReady: boolean,          // channel ready 
    isInitiator: boolean,             // Am I a initiator
    isStarted: boolean,               // Has started ???
    pc: null | RTCPeerConnection,     // Peer connection
    remoteStream: null | MediaStream, // Remote camera
}

interface StreamConstraints {
    audio: boolean,
    video: boolean
}


