/* 受信・送信したチャットメッセージを表示するコンポーネント
 *
*/

export { ChatMessageBoard };

// React 
import * as React	from 'react';
import * as ReactDOM	from "react-dom";

// クライアントサイドの状態，通信に必要なものなど
import { ChatMessage }		from './../../../../../chatMessage';
import { UserInfo, UserId }	from './../../../../../userInfo';
import { Remote }		from "./../../ts/clientState";

// Material.ui
import { makeStyles }	from '@material-ui/core/styles';
import Card		from '@material-ui/core/Card';
import CardContent	from '@material-ui/core/CardContent';
import CardHeader	from '@material-ui/core/CardHeader';
import Button		from '@material-ui/core/Button';
import Typography	from '@material-ui/core/Typography';
import Grid		from '@material-ui/core/Grid';
import Box		from '@material-ui/core/Box';



interface ChatMessageProps {
    chatMessage: ChatMessage;
    fromUser: string;
};


const useStyles = makeStyles({
    root	: { minWidth: 'calc(30vw - 20px)', marginLeft: "10px", marginRight: "10px",
		    borderRadius: '20px 20px 20px 0' },
    // 画面の 30% をチャットメッセージの幅ということにしている．でも可変にできるとかっこいいなぁ
    title	: { float: 'left' },
    time	: { fontSize: 14, float: 'right' },
    body	: { clear: 'both' }
});


// 受信・送信したチャットメッセージ一つ分のコンポーネント
const  ChatMessageContainer: React.FC<ChatMessageProps> = (props: ChatMessageProps) => {
    const classes = useStyles();
    
    return (
	<Card className={classes.root} >
	    <CardContent>
		<Typography className={classes.title} variant="h5" component="h2">{props.fromUser}</Typography>
		<Typography className={classes.time} color="textSecondary">{props.chatMessage.time}</Typography>
		<Typography variant="body2" component="p" className={classes.body}>
		    {props.chatMessage.message}
		</Typography>
	    </CardContent>
	</Card>
    );
}





interface ChatMessageBoardProps {
    myInfo: UserInfo;
    chatMessages: ChatMessage[];
    remotes: Map<UserId, Remote>;
}


// 受信・送信したチャットメッセージ一覧を表示する
// 新しいチャットメッセージを受信したときは，一番下にスクロールする
class ChatMessageBoard extends React.Component<ChatMessageBoardProps, {}> {
    //    el: React.RefObject<HTMLElement> | null;
    //    el: HTMLDivElement;    
    el: any; // Todo: type this
    constructor(props: ChatMessageBoardProps) {
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
		spacing={3}
		style={{position: 'relative', marginBottom: "0px", marginTop: "10px" }}
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

