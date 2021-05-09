import * as React from 'react';
import * as ReactDOM from "react-dom";


type AppProps = {
    message: string;
};

const App = ({ message }: AppProps) => <div>{ message } </div>;

