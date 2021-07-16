/* 受信・送信したチャットメッセージを表示するコンポーネント
 *
*/

export { ChatBoard };

// React 
import * as React	from 'react';
import * as ReactDOM	from "react-dom";


// クライアントサイドの状態，通信に必要なものなど
import { ChatMessage }		from './../../../chatMessage';
import { Remote }		from "./ts/clientState";
import { UserInfo, UserId }	from './../../../userInfo';

// Material.ui
import { makeStyles }	from '@material-ui/core/styles';
import Card		from '@material-ui/core/Card';
import CardContent	from '@material-ui/core/CardContent';
import CardHeader	from '@material-ui/core/CardHeader';
import Button		from '@material-ui/core/Button';
import Typography	from '@material-ui/core/Typography';
import Grid		from '@material-ui/core/Grid';
import Box		from '@material-ui/core/Box';



const useStyles = makeStyles({
    root: { minWidth: '20vw' }, // 画面の 20% をチャットメッセージの幅ということにしている．でも可変にできるとかっこいいなぁ
    userName: { float: 'left' },
    time: { fontSize: 14, float: 'right' }
});

const  ChatMessageContainer: React.FC<ChatMessageProps> = (props: ChatMessageProps) => {
    const classes = useStyles();
    
    return (
	<Card className={classes.root} >
	    <CardHeader title={props.fromUser} subheader={props.chatMessage.time} />
	    <CardContent>
		<Typography variant="body2" component="p">
		    {props.chatMessage.message}
		</Typography>
	    </CardContent>
	</Card>
    );
}

interface ChatMessageProps {
    chatMessage: ChatMessage;
    fromUser: string;
};




interface ChatBoardProps {
    myInfo: UserInfo;
    chatMessages: ChatMessage[];
    remotes: Map<UserId, Remote>;
}

class ChatBoard extends React.Component<ChatBoardProps, {}> {
    //    el: React.RefObject<HTMLElement> | null;
    //    el: HTMLDivElement;    
    el: any; // Todo: type this
    constructor(props: ChatBoardProps) {
        super(props)
        this.el = React.createRef()
    }


    componentDidMount() {
        this.scrollToBottom();
    }

    componentDidUpdate() {
        this.scrollToBottom();
    }

    scrollToBottom() {
        this.el.scrollIntoView({ behavior: 'smooth' });
    }

    render() {
        return <Box className="chatBoardContainer" height="80%" width="100%"
	       	    style={{overflowY: 'scroll', overflowX: 'hidden'}}
	       >
	    <Grid
		container
		direction="column"
		alignItems="flex-end"
		justify="center"
		spacing={4}
		style={{position: 'relative', marginBottom: "0px" }}
	    >
		{
                    this.props.chatMessages.map((chatMessage, index) =>
			<Grid item xs={12}>
			    <ChatMessageContainer
			    key         ={index.toString()}
			    chatMessage ={chatMessage}
			    fromUser    ={
			    this.props.remotes.get(chatMessage.userId)?.userInfo.userName ??
			    // If not other user then it's me!
			    this.props.myInfo.userName
			    }
			    />
			</Grid>
                    )
		}
	    </Grid>
	    <div className="dummy" ref={(el) => { this.el = el; }} />
        </Box>
    }
}

