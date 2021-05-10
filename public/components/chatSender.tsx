export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../ts/chatMessage";
import { Message } from "./../ts/message";
import { UserId } from './userInfo';

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
      console.log(`sendChatMessage`, this.state.value);
      const message = this.state.value;
      if (message === "") return;
      
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
}

    const sendChatMessage = (_: MouseEvent): void => {
    console.log(`sendChatMessage`);
    const inputValue = textbox.value;
    textbox.value = "";
    if (inputValue === "") return;
    const chatMessage: ChatMessage = {
        userId: clientState.userId!,
        time: getTimeString(),
        message: inputValue,
    };
    sendMessage({ type: "chat", chatMessage: chatMessage });

    /*
       const chatMessageElement = getChatMessageElement(
       clientState.userInfo.userName,
       chatMessage.time,
       chatMessage.message
       );
       chatMessageElement.className += " my-message";
       chatBoard.appendChild(chatMessageElement);
     */



};



sendButton.onclick = sendChatMessage;

