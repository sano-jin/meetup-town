export { ChatBoard };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../chatMessage";
import { Remote } from './../ts/clientState';
import { UserId, UserInfo } from './../../userInfo';


interface ChatMessageProps {
    chatMessage: ChatMessage;
    fromUser: string;
};

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
            <div className="chatBoard">
                {
                    this.props.chatMessages.map((chatMessage, index) =>
                        <ChatMessageContainer
                            key         ={index.toString()}
                            chatMessage ={chatMessage}
                            fromUser    ={
                            this.props.remotes.get(chatMessage.userId)?.userInfo.userName ??
                            // If not other user then it's me!
                            this.props.myInfo.userName
                            }
                        />
                    )
                }
            </div>
            <div className="dummy" ref={(el) => { this.el = el; }} />
        </div>
    }
}

