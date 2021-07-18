////////////////////////////////////////////////////////////////////////////////
//
// アプリのメイン画面
//
////////////////////////////////////////////////////////////////////////////////


// リファクタリング必須！！！
// 余計なインポートとかがあったら消してくれ


export { View };

// クライアントサイドの状態，通信に必要なものなど
import { ClientState, RemoteUser } from "./ts/clientState";
import { ChatMessage }         from './../../../chatMessage';
import { UserInfo, UserId }    from './../../../userInfo';
import { PDFCommandType }      from './../../../PDFCommandType';

// View のコンポーネント
import { ChatMessageBoard }					from "./View/ChatBoard/ChatMessage";
import { ChatSender }						from "./View/ChatBoard/ChatSender";
import { VideoElement, VideoBoard, getVideoElementProps }	from "./View/VideoElement";
import { PdfHandle }						from "./View/PdfHandler";
import { LabelBottomNavigation }				from "./View/Navigation"

// React 
import * as React	from 'react';

// Material.ui
import Button	from '@material-ui/core/Button';
import Grid	from '@material-ui/core/Grid';
import Box	from '@material-ui/core/Box';




// View の状態
interface ViewProps {
    clientState: ClientState; // クライアントサイドの状態
    sendChatMessage: (message: string) => void;
    sendPDFCommand: (com: PDFCommandType) => void;
}
    

// アプリのメイン画面
const View: React.FC<ViewProps> = (viewProps: ViewProps) => {
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
	    display	="flex"
            margin	="0"
            style	={{height:'calc(100% - 60px)'}}
	>
	    {/* チャット用のモジュール */}
	    <Box
		height="100%"
		width="30%"
		style={{backgroundColor: '#212121'}}
	    >
		{/* チャットメッセージの表示 */}
		<ChatMessageBoard
		chatMessages	={viewProps.clientState.chats}
		remoteUsers	={viewProps.clientState.remoteUsers}
		myInfo		={viewProps.clientState.userInfo}/>

		{/* チャットメッセージの送信 */}
		<ChatSender sendChatMessage={viewProps.sendChatMessage} />
	    </Box>
	    
	    {/* ビデオ・共有スライドの表示パネル */}
	    <Box height="100%" width="70%">
		{/* ビデオの表示パネル */}
		<VideoBoard videoElements={getVideoElementProps(viewProps.clientState)} />

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
		    <PdfHandle sendPDFCommand={viewProps.sendPDFCommand}/>
		</Box>
	    </Box>	
	</Box>
	
	{/* ナビゲーションバー */}
	<Box bottom="0" position="fixed" width="100%" height="60px">
            <LabelBottomNavigation />
	</Box>
    </Box>);
}

