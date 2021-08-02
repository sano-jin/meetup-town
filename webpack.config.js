const path = require('path')
const nodeExternals = require('webpack-node-externals')
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');


module.exports = [
    {
        cache: {
	    type: 'filesystem',
	    buildDependencies: {
		config: [__filename]
	    }
	},
        name: 'server',
        entry: './src/server/server.ts',
        target: 'node',
        output: {
            path: __dirname + '/dist',
            filename: 'server.js',
	    publicPath: '/'
        },
        target: 'node',
        externals: [nodeExternals()],
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.json"
                    }
                }
            ]
        },
        devServer: {
            historyApiFallback: true
        },
        resolve: {
            extensions: [".ts", ".js", ".json", "tsx"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
    },
    {
        cache: {
	    type: 'filesystem',
	    buildDependencies: {
		config: [__filename]
	    }
	},
        name: 'client',
        entry: './src/client/App.tsx',
        output: {
            path: __dirname + '/public/dist',
            filename: 'bundle.js',
        },
        target: ['web', 'es5'],
        /*
        externals: {
            "react": "React",
            "react-dom": "ReactDOM",
            "react-bootstrap": "ReactBootstrap",
            "griddle-react": "Griddle",
            "underscore": "_",
            'bufferutil': 'bufferutil',
            'utf-8-validate': 'utf-8-validate'
        },
        */
        externals: ['bufferutil', 'utf-8-validate'],
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    exclude: /node_modules/,
                    loader: "ts-loader",
                    options: {
                        configFile: "tsconfig.json",
                    }
                }
            ]
        },
        plugins: [
            // フォントのmap設定。react-pdfのリポジトリにある書き方は若干古い
            new CopyWebpackPlugin({
                patterns: [
                    {
                        from: "node_modules/pdfjs-dist/cmaps/",
                        to: "cmaps/",
                    },
                ],
            }),
        ],
        resolve: {
            extensions: [".ts", ".js", ".json", ".tsx"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
    }
];
