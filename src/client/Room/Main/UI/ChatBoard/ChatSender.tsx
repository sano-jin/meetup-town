////////////////////////////////////////////////////////////////////////////////
//
// チャットを送信する送信ボックスのコンポーネント
//
////////////////////////////////////////////////////////////////////////////////


export { ChatSender };

// React 
import * as React	from 'react';

// Material.ui
import Button from '@material-ui/core/Button';


// Main.tsx において定義される関数 sendChatMessage の型を指定する
interface ChatMessageProps {
    sendChatMessage: (message: string) => void;
};

// チャットを送信する送信ボックスのコンポーネント
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
		style={{position: 'absolute', height: '20%',
			width: 'calc(30vw - 20px)', marginLeft: "10px", marginRight: "10px"}}
	    >
		<textarea value={this.state.value} onChange={this.handleChange} id="input-message"
		style={{height:'calc(100% - 60pt)', width:'calc(30vw - 20px)' }}
		/>
		
		<Button onClick={this.handleSubmit} fullWidth>Send</Button>
            </form>
        );
    }
};

