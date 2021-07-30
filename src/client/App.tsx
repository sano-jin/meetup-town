/* クライアントサイドのトップレベル
 * - ホームページへの URL の場合は `Create a new room` の画面になる
 * - 部屋の id も込みの URL の場合は `Enter your name` の画面になる
*/

// コンポーネント
import { Home } from "./Home/Home";
import { Room } from "./Room/Room";

// React
import * as React	from 'react';
import * as ReactDOM	from "react-dom";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    useParams,
    Link
} from "react-router-dom";

// Material.ui
import { createMuiTheme, ThemeProvider }	from "@material-ui/core/styles";
import * as colors				from "@material-ui/core/colors";
import CssBaseline				from "@material-ui/core/CssBaseline";
import Box					from '@material-ui/core/Box';



// 何やらよくわからないけど material.ui のテーマを設定している
const DarkTheme: React.FC = ({ children }) => {
    const theme = createMuiTheme({
	palette: {
	    primary: {
		main: colors.blue[800],
	    },
	    type: "dark",
	},
    });
    
    return (
	<ThemeProvider theme={theme}>
	    <CssBaseline />
	    <App />
	</ThemeProvider>
    );
};


// メイン画面
const App: React.FC<{}> = () => {
    return (
	<Box className="App" height="100vh" width="100vw">
	    <Router>
		<div>
		    <Switch>
			{/* 部屋の id も込みで入力された場合は部屋への入り口の画面になる */}
			<Route path='/rooms/:roomId' component={() => {
			    const { roomId } = useParams<{roomId: string}>();
			    return <Room roomId={roomId} />
			}}/>

			{/* それ以外ならホーム画面へ飛ぶ */}
			<Route exact path='/' component={Home}/>
		    </Switch>
		</div>
	    </Router>
	</Box>
    );
}


ReactDOM.render(
    <DarkTheme />,
    document.getElementById('root')
);

