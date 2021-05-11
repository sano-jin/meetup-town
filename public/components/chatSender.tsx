export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../ts/chatMessage";
import { Message } from "./../ts/message";
import { UserId } from './../ts/userInfo';

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

    handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const message = this.state.value;
        if (message === "") return;
        console.log(`sendChatMessage`, message);
        this.props.sendChatMessage(message);
    }

    render() {
        return (
            <form onSubmit={this.handleSubmit} id="message-from">
                <label>
                    <textarea value={this.state.value} onChange={this.handleChange} id="input-message" />
                </label>
                <label>
                <input type="submit" value="Send" className="send-button" />
                    <i className="fas fa-paper-plane"></i>
                </label>
            </form>
        );
    }
};

