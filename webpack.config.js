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
            extensions: [".ts", ".js", ".json", "tsx"],
            alias: {
                "@": path.join(__dirname, "/src/")
            }
        }
    },
    {
        name: 'client',
        entry: './public/App.tsx',
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
