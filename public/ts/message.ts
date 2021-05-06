export { Message };
import { ChatMessage } from './chatMessage';

interface Candidate {
    type: 'candidate',
    label: RTCIceCandidate["sdpMLineIndex"],
    id: RTCIceCandidate["sdpMid"],
    candidate: RTCIceCandidate["candidate"],
}

interface Bye {
    type: 'bye',
}

interface Call {
    type: 'call',
}

interface Chat {
    type: 'chat',
    chatMessage: ChatMessage,
}

type Message = Bye | Call | Chat | RTCSessionDescriptionInit | Candidate;
