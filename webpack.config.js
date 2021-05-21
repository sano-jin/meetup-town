const path = require('path')
const nodeExternals = require('webpack-node-externals')
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = [
    {
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
	plugins: [
	    new HtmlWebpackPlugin({
		template: 'views/index.ejs'
	    })
	],
        resolve: {
            extensions: [".ts", ".js", ".json", "tsx"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
    },
    {
        name: 'client',
        entry: './src/client/App.tsx',
        output: {
            path: __dirname + '/public/dist',
            filename: 'bundle.js',
        },
        target: ['web', 'es5'],
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
        resolve: {
            extensions: [".ts", ".js", ".json", ".tsx"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }        
    }
];
