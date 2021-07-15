/* チャットを送信する送信ボックスのコンポーネント
 *
 */

export { ChatSender };
import * as React from 'react';
import * as ReactDOM from "react-dom";
import { ChatMessage } from "./../../../../chatMessage";
import { Message } from "./../../../../message";
import { UserId } from './../../../../userInfo';



// チャットを送信するための関数を上から受け取る必要がある
interface ChatMessageProps {
    sendChatMessage: (message: string) => void;
};



// チャット送信ボックスのコンポーネント
class ChatSender extends React.Component<ChatMessageProps, { value: string }> {
    constructor(props: ChatMessageProps) {
        super(props);
        this.state = { value: "" };
        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    // テキストエリアの中で変化が起きたら（文字を入力されたら）状態に新しくセットしてやる
    handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        this.setState({ value: event.target!.value });
    }
    
    // ボタンがクリックされたらチャットメッセージを送信する
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
	    <form action="#" style={{bottom: 0, position: 'relative'}}>
		<textarea value={this.state.value} onChange={this.handleChange} id="input-message" />
                
                <label className="send-button-container">
                    <input type="submit" value="Send" className="send-button" onClick={this.handleSubmit} />
                    <i className="fas fa-paper-plane"></i>
                </label>
            </form>
        );
    }
};

