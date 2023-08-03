const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/app.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'dist'),
        publicPath: '/dist/'
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.js', '.tsx']
    },
    plugins: [
        new webpack.DefinePlugin({
            BUILD_ENV: JSON.stringify('dev')
        })
    ],
    devServer: {
        static: {
            directory: path.join(__dirname, '/')
        },
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                pathRewrite: { '^/api': '' },
            },
        }
    }
};

