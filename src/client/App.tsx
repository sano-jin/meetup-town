import { Main } from "./components/main";
import { Home } from "./Home";
import { RoomEntry } from "./RoomEntry";
import { getStringFromUser, getTimeString } from '../util'
import * as React from 'react';
import * as ReactDOM from "react-dom";
import {
    BrowserRouter as Router,
    Switch,
    Route,
    useParams,
    Link
} from "react-router-dom";
import { createMuiTheme, ThemeProvider } from "@material-ui/core/styles";
import * as colors from "@material-ui/core/colors";
import CssBaseline from "@material-ui/core/CssBaseline";
import Box from '@material-ui/core/Box';


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


class App extends React.Component {
    render() {
	return (
	    <Box className="App" height="100vh" width="100vw">
		<Router>
		    <div>
			<Switch>
			    <Route path='/rooms/:roomId' component={() => {
				const { roomId } = useParams<{roomId: string}>();
				return <RoomEntry roomId={roomId} />
			    }}/>
			    <Route exact path='/' component={Home}/>
			</Switch>
		    </div>
		</Router>
	    </Box>
	);
    }
}

ReactDOM.render(
    <DarkTheme />,
    document.getElementById('root')
);

