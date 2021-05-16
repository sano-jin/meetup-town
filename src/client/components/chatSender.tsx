export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../chatMessage";
import { Message } from "./../../message";
import { UserId } from './../../userInfo';

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

    handleSubmit(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
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
            <form id="message-from" action="#">
                <textarea value={this.state.value} onChange={this.handleChange} id="input-message" />
                
                <label className="send-button-container">
                    <input type="submit" value="Send" className="send-button" onClick={this.handleSubmit} />
                    <i className="fas fa-paper-plane"></i>
                </label>
            </form>
        );
    }
};

