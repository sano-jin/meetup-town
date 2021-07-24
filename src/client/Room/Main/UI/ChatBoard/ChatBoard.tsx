////////////////////////////////////////////////////////////////////////////////
//
// チャット用のコンポーネントのトップレベル
// **まだこれは使っていない**
//
////////////////////////////////////////////////////////////////////////////////


// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


// 
// 
// export { ChatBoard };
// 
// // クライアントサイドの状態，通信に必要なものなど
// import { ChatMessage }		from './../../../../../chatMessage';
// import { UserInfo, UserId }	from './../../../../../userInfo';
// import { Remote }		from "./../../ts/clientState";
// 
// 
// // コンポーネント
// import { ChatMessageBoard }	from "./ChatBoard/ChatMessage";
// import { ChatSender }		from "./ChatBoard/ChatSender";
// 
// // React 
// import * as React	from 'react';
// 
// // Material.ui
// import Button	from '@material-ui/core/Button';
// import Grid	from '@material-ui/core/Grid';
// import Box	from '@material-ui/core/Box';
// 
// 
// 
// 
// // ChatBoard のプロパティ
// interface ChatBoardProps {
//     myInfo: UserInfo; // 自分のユーザ情報
//     chatMessages: ChatMessage[]; // チャットメッセージのリスト
//     remotes: Map<UserId, Remote>; // 他のユーザの情報
//     sendChatMessage: (message: string) => void; // Main.tsx において定義される関数 sendChatMessage の型
// }
// 
// 
// // ChatBoard のメイン画面
// const ChatBoard: React.FC<ChatBoardProps> = (props: ChatBoardProps) => {
//     return (
// 	<Box
// 	    height="100%"
// 	    width="100%"
// 	    style={{backgroundColor: '#212121'}}
// 	>
// 	    {/* チャットメッセージの表示 */}
// 	    <ChatMessageBoard
// 		chatMessages={uiProps.clientState.chats}
// 		remotes={uiProps.clientState.remotes}
// 		myInfo={uiProps.clientState.userInfo}/>
// 	    
// 	    {/* チャットメッセージの送信 */}
// 	    <ChatSender sendChatMessage={uiProps.sendChatMessage} />
// 	</Box>
//     );
// }
// 
// 
