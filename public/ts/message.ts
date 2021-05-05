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

interface Call {
    type: "call",
}

type Message = Candidate | Bye | Call | RTCSessionDescriptionInit;
