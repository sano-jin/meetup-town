/** サーバ・クライアント間で送受信し合うもの全てをまとめた定義
 *
 */


export { Message };
import { ChatMessage } from './chatMessage';
import { PDFCommandType } from './PDFCommandType';

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

interface PDFCommand{
    type: 'pdfcommand',
    command: PDFCommandType,
}

type Message = Bye | Call | Chat | PDFCommand | RTCSessionDescriptionInit | Candidate;
