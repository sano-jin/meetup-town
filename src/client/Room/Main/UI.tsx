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
import { PDFCommandType } from './../../../PDFCommandType';

// UI のコンポーネント
import { ChatMessageBoard } from "./UI/ChatBoard/ChatMessage";
import { ChatSender } from "./UI/ChatBoard/ChatSender";
import { VideoBoard, getVideoElementProps } from "./UI/VideoElement";
import { FileState, PageNumber, PdfHandle } from "./UI/PdfHandler";
import { LabelBottomNavigation } from "./UI/Navigation";

// React 
import * as React from 'react';

// Material.ui
import Box from '@material-ui/core/Box';




// UI の状態
interface UIProps {
	clientState: ClientState; // クライアントサイドの状態
	sendChatMessage: (message: string) => void;
	setNumPages: (numPages: PageNumber) => void;
	sendPDFCommand: (com: PDFCommandType) => void;
	sendPDFContent: (content: FileState) => void;
}



// アプリのメイン画面
const UI: React.FC<UIProps> = (uiProps: UIProps) => {
	return (<Box height="100vh" >
		{/* チャットとビデオの要素を囲むBox 
	    現状決め打ちで 30%:70% でチャット画面とビデオ画面を分けているが，可変にできるとかっこいい
	  */}
		<Box
			display="flex"
			margin="0"
			style={{ height: 'calc(100% - 60px)' }}
		>
			{/* チャット用のモジュール */}
			<Box
				height="100%"
				width="30%"
				style={{ backgroundColor: '#212121' }}
				border={1}
			>
				{/* チャットメッセージの表示 */}
				<ChatMessageBoard
					chatMessages={uiProps.clientState.chats}
					remotes={uiProps.clientState.remotes}
					myInfo={uiProps.clientState.userInfo} />

				{/* チャットメッセージの送信 */}
				<ChatSender sendChatMessage={uiProps.sendChatMessage} />
			</Box>

			{/* ビデオ・共有スライドの表示パネル */}
			<Box height="100%" width="70%" right="0">
				{/* ビデオの表示パネル */}
				<Box height="20%" border={1}>
					<VideoBoard videoElements={getVideoElementProps(uiProps.clientState)} />
				</Box>

				{/* 共有スライドの表示パネル */}
				<Box
					component="div"
					height="80%"
					border={1}
				>
					<PdfHandle
						file={uiProps.clientState.pdfContent}
						numPages={uiProps.clientState.numPages}
						nowPage={uiProps.clientState.nowPage}
						setNumPages={uiProps.setNumPages}
						sendPDFCommand={uiProps.sendPDFCommand}
						sendPDFContent={uiProps.sendPDFContent}
					/>
				</Box>
			</Box>
		</Box>

		{/* ナビゲーションバー */}
		<Box bottom="0" position="fixed" width="100%" height="60px">
			<LabelBottomNavigation />
		</Box>
	</Box>);
};

