//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');

// Load environment variables
require('dotenv').config();

/** @type {import('webpack').Configuration} */
const config = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [
    new webpack.DefinePlugin({
      'INJECTED_CLIENT_ID': JSON.stringify(process.env.BLOGGER_OAUTH_CLIENT_ID || ''),
      'INJECTED_CLIENT_SECRET': JSON.stringify(process.env.BLOGGER_OAUTH_CLIENT_SECRET || '')
    })
  ],
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};

module.exports = config;
