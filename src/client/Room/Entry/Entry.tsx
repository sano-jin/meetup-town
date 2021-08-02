/* 部屋に入って名前を入力するためのコンポーネント
 * ユーザ名を入力してもらって，入力されたユーザ名で setUserInfo を実行する
*/

export { Entry };
import { UserInfo } from "../../../userInfo";
import * as React from 'react';

import { createStyles, makeStyles, Theme } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Box from '@material-ui/core/Box';
import Grid from '@material-ui/core/Grid';


interface Action {
	type: string;
	payload: UserInfo;
}

interface EntryProps {
	dispatch: (message: Action) => void;
}

const Entry: React.FC<EntryProps> = (props: EntryProps) => {
	const [userName, setUserName] = React.useState<string>("");

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setUserName(event.target.value);
	};

	const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!userName) return;
		console.log("userName set", userName);
		props.dispatch({ type: 'setUserInfo', payload: { userName } });
	};

	return (
		<Grid container justify="center" >
			<Box display="flex" alignItems="center" height="100vh">
				<form onSubmit={handleFormSubmit}>
					<TextField id="userName-form" label="Username" onChange={handleChange} autoFocus={true} />
				</form>
			</Box>
		</Grid>
	);
};
