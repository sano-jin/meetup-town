export { chatBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../ts/chatMessage";
import { clientState } from './../ts/client';


type ChatMessageProps = {
    key: string;
    chatMessage: ChatMessage;
};

class ChatMessageContainer extends React.Component<ChatMessageProps, {}> {
    render() {
        return <li className="chatContainer" key={this.props.key}>
            <div className="chat-userName-date-container">
                <span className="chat-userName-item">
                    {
                        clientState.remotes.get(this.props.chatMessage.userId)!
                                   .userInfo.userName
                    }
                </span>
                <span className="chat-date-item">{this.props.chatMessage.time}</span> 
            </div>
            <div className="chat-message-item">
                {this.props.chatMessage.message}
            </div>
        </li>;
    }
}


type ChatBoardProps = {
    chatMessages: ChatMessage[];
}

class ChatBoard extends React.Component<ChatBoardProps, {}> {
    render() {
        return <div className="chatBoardContainer">
        <ul className="chatBoard">
        {
                    this.props.chatMessages.map((chatMessage, index) =>
                        <ChatMessageContainer
                            key     ={index.toString()}
                            chatMessage={chatMessage}
                        />
                    )
                }
            </ul>
        </div>
    }
}

