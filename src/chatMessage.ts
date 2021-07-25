/* チャットメッセージをやり取りするためのデータの定義
 * 
*/

export { ChatMessage };
import { UserId } from './userInfo';

interface ChatMessage {
    //    isMine: boolean;
    //    key: string;
    userId: UserId;
    time: string;     // Todo: 文字列を送受信するんじゃなくて，Time 型？みたいなのにしたい
    message: string;
}


