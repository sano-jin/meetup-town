/** サーバ・クライアント間で送受信し合うもの全てをまとめた定義
 *
 */


export { Message };
import { ChatMessage } from './chatMessage';
import { FileState } from './client/Room/Main/UI/PdfHandler';
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

interface PDFSend{
    type: 'pdfsend'
    content: FileState,
}

type Message = Bye | Call | Chat | PDFCommand | PDFSend | RTCSessionDescriptionInit | Candidate;
