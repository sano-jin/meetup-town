export { ChatMessage };
import { UserId } from './userInfo';

interface ChatMessage {
    //    isMine: boolean;
    //    key: string;
    userId: UserId;
    time: string;     // Todo: replace this with proper type
    message: string;
}


