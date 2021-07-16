/* チャットを送信する送信ボックスのコンポーネント
 *
 */

export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../../../chatMessage";
import { Message } from "./../../../../message";
import { UserId } from './../../../../userInfo';
import Button from '@material-ui/core/Button';



interface ChatMessageProps {
    sendChatMessage: (message: string) => void;
};

class ChatSender extends React.Component<ChatMessageProps, { value: string }> {
    constructor(props: ChatMessageProps) {
        super(props);
        this.state = { value: "" };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        this.setState({ value: event.target!.value });
    }

    handleSubmit(event: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
        event.preventDefault();
        this.setState(state => {
            const message = state.value;
            if (message === "") return state;
            console.log(`sendChatMessage`, message);
            this.props.sendChatMessage(message);
            return { value: "" };
        });
    }

    render() {
        return (
	    <form
		id="message-from"
		action="#"
		style={{position: 'absolute', height: '20%', width: '20vw'}}
	    >
            <textarea value={this.state.value} onChange={this.handleChange} id="input-message"
		style={{height:'calc(100% - 60pt)', width:'20vw' }}
	    />
	    
	    <Button onClick={this.handleSubmit} fullWidth>Send</Button>
            </form>
        );
    }
};

