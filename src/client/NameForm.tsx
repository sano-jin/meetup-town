export { NameForm };
import { UserInfo } from "../userInfo.ts";
import * as React from 'react';
import * as ReactDOM from "react-dom";

interface NameFormProps {
    setUserInfo: (userInfo: UserInfo) => void;
}

class NameForm extends React.Component<NameFormProps, { value: string }> {
    constructor(props: NameFormProps) {
	super(props);
	this.state = {value: ''};

	this.handleChange = this.handleChange.bind(this);
	this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event: React.ChangeEvent<HTMLInputElement>) {
	this.setState({value: event.target.value});
    }

    handleSubmit(event: React.MouseEvent<HTMLInputElement, MouseEvent>) {
	event.preventDefault();
	const value = this.state?.value;
	if(!value) return;
	console.log("userName set", value)
	this.props.setUserInfo({ userName: value });
    }

    render() {
	return (
            <form id="name-form" action="#">
                <input type="text" value={this.state.value} onChange={this.handleChange}/>
                
                <label className="send-button-container">
                    <input type="submit" value="Join" className="send-button" onClick={this.handleSubmit} />
                    <i className="fas fa-door-open"></i>
                </label>
            </form>
	);
    }
}

