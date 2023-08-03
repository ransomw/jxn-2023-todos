const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'development',
    entry: './src/app.ts',
    output: {
        filename: 'bundle.js',
        path: path.resolve(__dirname, 'srv_static', 'js'),
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
            BUILD_ENV: JSON.stringify('prod')
        })
    ]
};

