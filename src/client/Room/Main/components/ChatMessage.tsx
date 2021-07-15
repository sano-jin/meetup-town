/* チャットメッセージを表示するコンポーネント
 *
*/


export { ChatBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../../../chatMessage";
import { Remote } from './../ts/clientState';
import { UserId, UserInfo } from './../../../../userInfo';

import { makeStyles } from '@material-ui/core/styles';
import Card from '@material-ui/core/Card';
// import CardActions from '@material-ui/core/CardActions';
import CardContent from '@material-ui/core/CardContent';
import CardHeader from '@material-ui/core/CardHeader';
import Button from '@material-ui/core/Button';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';

const useStyles = makeStyles({
    root: { minWidth: 275 },
    userName: { float: 'left' },
    time: { fontSize: 14, float: 'right' }
});

const  ChatMessageContainer: React.FC<ChatMessageProps> = (props: ChatMessageProps) => {
    const classes = useStyles();
    
    return (
	<Card className={classes.root}>
	    <CardHeader
	    title={props.fromUser}
	    subheader={props.chatMessage.time}
	    />
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

/*
class ChatMessageContainer extends React.Component<ChatMessageProps, {}> {
    render() {
        return <div className="chat-item">
            <div className="chat-userName-date-container">
                <span className="chat-userName-item">{this.props.fromUser}</span>
                <span className="chat-date-item">{this.props.chatMessage.time}</span> 
            </div>
            <div className="chat-message-item">
                {this.props.chatMessage.message}
            </div>
        </div>;
    }
}

*/

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
        return <div className="chatBoardContainer">
	    <Grid
		container
		direction="column"
		justify="center"
		spacing={4}
		style={{height:'auto', position: 'relative', marginBottom: "40px"}}
	    >
		{
                    this.props.chatMessages.map((chatMessage, index) =>
			<Grid
			    item xs={8}
			>
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
        </div>
    }
}

