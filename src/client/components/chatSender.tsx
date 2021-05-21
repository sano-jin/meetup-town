export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../chatMessage";
import { Message } from "./../../message";
import { UserId } from './../../userInfo';


import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import IconButton from '@material-ui/core/IconButton';
import FormControl from '@material-ui/core/FormControl';
import SendIcon from '@material-ui/icons/Send';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';

interface ChatMessageProps {
    sendChatMessage: (message: string) => void;
};

const ChatSender: React.FC<ChatMessageProps> = (props: ChatMessageProps) => {
    const [message, setMessage] = React.useState<string>("");

    const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
	setMessage(event.target!.value);
    }

    const handleSubmit = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        event.preventDefault();
	if (message === "") return;
	console.log(`sendChatMessage`, message);
        props.sendChatMessage(message);
	setMessage("");
    }

    return (
	<FormControl
	    id="message-from"
	    style={{bottom: 0, position: 'relative'}}
	>
	    <Grid container spacing={1} alignItems="flex-end">
		<Grid item>
		    <textarea
			value={message}
			onChange={handleChange}
			id="input-message"
			color="white"
			style={{
			    fontSize: 18,
			    width: "calc(100% - 5em)",
			    height:"8em",
			    minWidth:"calc(350px - 5em)",
			    backgroundColor:"rgba(50, 50, 50, 0.5)",
			    color: "white"
			}}
		    />
		</Grid>
		<Grid item>		    
		    <IconButton aria-label="send-button" color="primary" onClick={handleSubmit}>
			<SendIcon />
		    </IconButton>
		</Grid>
	    </Grid>
        </FormControl>
    );
};

