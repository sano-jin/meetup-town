export { Message };

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
