export { ChatMessage };
import { UserId } from './userInfo';

interface ChatMessage {
    fromUser: UserId;
    time: string;     // Todo: replace this with proper type
    message: string;
}

