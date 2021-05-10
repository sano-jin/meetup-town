export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../ts/chatMessage";
import { Message } from "./../ts/message";
import { UserId } from './../ts/userInfo';

type ChatMessageProps = {
    sendChatMessage: (message: string) => Promise<void>;
};

class ChatSender extends React.Component<ChatMessageProps, { value: string }> {
    constructor(props) {
        super(props);
        this.state = { value: "" };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({value: event.target.value});
  }

  handleSubmit(event) {
      event.preventDefault();
      const message = this.state.value;
      if (message === "") return;
      console.log(`sendChatMessage`, this.state.value);
      sendChatMessage(this.state.value);
  }

  render() {
    return (
        <form onSubmit={this.handleSubmit} id="message-from">
            <label>
                <textarea value={this.state.value} onChange={this.handleChange} id="input-message" />
            </label>
            <label>
                <input type="submit" value="Send" className="send-button" />
                <i class="fas fa-paper-plane"></i>
            </label>
        </form>
    );
  }
};

