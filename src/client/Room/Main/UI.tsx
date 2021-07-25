////////////////////////////////////////////////////////////////////////////////
//
// アプリのメイン画面
//
////////////////////////////////////////////////////////////////////////////////


// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


export { UI };

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, Remote } from "./ts/clientState";
import { ChatMessage }         from './../../../chatMessage';
import { UserInfo, UserId }    from './../../../userInfo';
import { PDFCommandType }      from './../../../PDFCommandType';

// UI のコンポーネント
import { ChatMessageBoard }					from "./UI/ChatBoard/ChatMessage";
import { ChatSender }						from "./UI/ChatBoard/ChatSender";
import { VideoElement, VideoBoard, getVideoElementProps }	from "./UI/VideoElement";
import { PdfHandle }						from "./UI/PdfHandler";
import { LabelBottomNavigation }				from "./UI/Navigation"

// React 
import * as React	from 'react';

// Material.ui
import Button	from '@material-ui/core/Button';
import Grid	from '@material-ui/core/Grid';
import Box	from '@material-ui/core/Box';




// UI の状態
interface UIProps {
    clientState: ClientState; // クライアントサイドの状態
    sendChatMessage: (message: string) => void;
    sendPDFCommand: (com: PDFCommandType) => void;
}
    

// アプリのメイン画面
const UI: React.FC<UIProps> = (uiProps: UIProps) => {
    const wholeBoxStyle = {
        component: "div",
        height: "100vh",
        display: "block",
        position: "relative",
        overflow: "hidden",
    }
    
    return (<Box height="100vh" >
	{/* チャットとビデオの要素を囲むBox 
	    現状決め打ちで 30%:70% でチャット画面とビデオ画面を分けているが，可変にできるとかっこいい
	  */}
	<Box
	    display="flex"
            margin="0"
            style={{height:'calc(100% - 60px)'}}
	>
	    {/* チャット用のモジュール */}
	    <Box
		height="100%"
		width="30%"
		style={{backgroundColor: '#212121'}}
	    >
		{/* チャットメッセージの表示 */}
		<ChatMessageBoard
		chatMessages={uiProps.clientState.chats}
		remotes={uiProps.clientState.remotes}
		myInfo={uiProps.clientState.userInfo}/>

		{/* チャットメッセージの送信 */}
		<ChatSender sendChatMessage={uiProps.sendChatMessage} />
	    </Box>
	    
	    {/* ビデオ・共有スライドの表示パネル */}
	    <Box height="100%" width="70%">
		{/* ビデオの表示パネル */}
		<VideoBoard videoElements={getVideoElementProps(uiProps.clientState)} />

		{/* 共有スライドの表示パネル */}
		<Box
		    component="div"
		    height="100%"
		    width="70vw"
		    position="absolute"
		    top="0"
		    right="0"
		    overflow="auto"
		>
		    <PdfHandle sendPDFCommand={uiProps.sendPDFCommand}/>
		</Box>
	    </Box>	
	</Box>
	
	{/* ナビゲーションバー */}
	<Box bottom="0" position="fixed" width="100%" height="60px">
            <LabelBottomNavigation />
	</Box>
    </Box>);
}

