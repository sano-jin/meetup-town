const path = require('path')
const nodeExternals = require('webpack-node-externals')

module.exports = [
    {
        name: 'server',
        entry: './src/index.ts',
        target: 'node',
        output: {
            path: __dirname + '/dist/server',
            filename: 'server.js',
        },
        target: 'node',   // THIS IS THE IMPORTANT PART
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
        // target: 'web', // by default
        output: {
            path: __dirname + '/public/js',
            filename: 'bundle.js',
        },
        target: 'node',   // THIS IS THE IMPORTANT PART
        mode: 'development',
        module: {
            rules: [
                {
                    test: /\.ts$/,
  //                  exclude: /node_modules/,
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
