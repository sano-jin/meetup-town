const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = [
    {
        name: 'server',
        entry: './src/server.ts',
        target: 'node',
        output: {
            path: __dirname + '/dist/server',
            filename: 'server.js',
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
        resolve: {
            extensions: [".ts", ".js", ".json"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
    },
    {
        name: 'client',
        entry: './public/js/main.ts',
        output: {
            path: __dirname + '/public/js',
            filename: 'bundle.js',
        },
        target: 'web',
        externals: ['bufferutil', 'utf-8-validate'], 
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
        resolve: {
            extensions: [".ts", ".js", ".json"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
        
    }
];
