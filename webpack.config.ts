import * as path from 'path';
import webpack from 'webpack';
// import nodeExternals from 'webpack-node-externals';

const paths = {
  nodeModules: path.resolve(__dirname, 'node_modules'),
  dist: path.resolve(__dirname, 'dist')
};

function config(entry: string, output: string, overrides: webpack.Configuration = {}): webpack.Configuration {
  return {
    optimization: {
      minimize: false
    },
    mode: 'development',
    target: 'node',
    entry: ['@babel/polyfill', entry],
    output: {
      path: paths.dist,
      filename: output,
      publicPath: '',
      ...overrides.output
    },
    resolve: {
      extensions: ['.js', '.ts'],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          loaders: ['babel-loader'],
          exclude: [paths.nodeModules],
        },
      ],
    },
    devtool: false,
    plugins: [
      // new WebpackManifestPlugin(),
      // new BundleAnalyzerPlugin(),
    ],
    externals: overrides.externals || undefined
  };
}

// Declares lambda bundle
// SHOULD BE IN A DIR FOR AWS CDK TO PACKAGE
const lambda = config('./src/lambda', 'lambda/index.js', {
  output: {
    libraryTarget: 'commonjs2'
  }
});

const construct = config('./src/index', 'index.js', {
  output: {
    libraryTarget: 'commonjs2'
  },
  externals: /\@aws-[cs]dk\/(\w)*/
});

export default [
  lambda, construct
];
