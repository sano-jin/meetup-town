export { ChatBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../ts/chatMessage";
import { Remote } from './../ts/clientState';
import { UserId } from './../ts/userInfo';


interface ChatMessageProps {
    key: string;
    chatMessage: ChatMessage;
    fromUser: string;
};

class ChatMessageContainer extends React.Component<ChatMessageProps, {}> {
    render() {
        return <li className="chatContainer" key={this.props.key}>
            <div className="chat-userName-date-container">
                <span className="chat-userName-item">{this.props.fromUser}</span>
                <span className="chat-date-item">{this.props.chatMessage.time}</span> 
            </div>
            <div className="chat-message-item">
                {this.props.chatMessage.message}
            </div>
        </li>;
    }
}


interface ChatBoardProps {
    chatMessages: ChatMessage[];
    remotes: Map<UserId, Remote>;
}

class ChatBoard extends React.Component<ChatBoardProps, {}> {
    //    el: React.RefObject<HTMLElement> | null;
    //    el: HTMLDivElement;
    
    el: any;
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
            <ul className="chatBoard">
                {
                    this.props.chatMessages.map((chatMessage, index) =>
                        <ChatMessageContainer
                            key         ={index.toString()}
                            chatMessage ={chatMessage}
                            fromUser    ={this.props.remotes.get(chatMessage.userId)?.userInfo.userName ?? "unknown"}
                        />
                    )
                }
            </ul>
            <div className="dummy" ref={(el) => { this.el = el; }} />
        </div>
    }
}

