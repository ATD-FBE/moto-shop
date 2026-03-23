import webpack from 'webpack';
import {
    PUBLIC_PATH,
    BUILD_FOLDER,
    BUILD_PATH,
    SRC_PATH,
    SHARED_ROOT,
    API_URL_PATH,
    STORAGE_URL_PATH
} from './server/config/paths.js';
import config from './server/config/config.js';

export default {
    mode: ['production', 'development'].includes(config.env) ? config.env : 'development',
    entry: './client/src/App.jsx',
    output: {
        path: BUILD_PATH,
        publicPath: `/${BUILD_FOLDER}/`,
        filename: 'bundle.js'
    },
    devtool: config.env === 'testing' ? 'eval-cheap-module-source-map' : undefined,
    devServer: {
        host: config.host,
        port: config.clientPort,
        historyApiFallback: true,
        hot: true,
        open: true,
        static: [
            { directory: PUBLIC_PATH },
            { directory: BUILD_PATH }
        ],
        proxy: [
            {
                context: [API_URL_PATH, STORAGE_URL_PATH],
                target: `http://${config.host}:${config.serverPort}`,
                changeOrigin: true,
                secure: false,
                ws: false
            }
        ],
        allowedHosts: 'all', // Для подключения с других хостов
        client: {
            webSocketURL: {
                hostname: config.host,
                port: config.clientPort,
                protocol: config.protocol === 'https' ? 'wss' : 'ws'
            }
        }
    },
    module: {
        rules: [
            {
                test: /\.(j|t)sx?$/, 
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            '@babel/preset-env',
                            ['@babel/preset-react', {
                                'runtime': 'automatic' // 
                            }],
                            '@babel/preset-typescript'
                        ]
                    }
                }
            },
            {
                test: /\.scss$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: false // Для подхватывания файлов по относительному пути
                        }
                    },
                    'sass-loader'
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
        extensionAlias: {
            '.js': ['.js', '.ts'],
            '.jsx': ['.jsx', '.tsx']
        },
        alias: {
            '@': SRC_PATH,
            '@shared': SHARED_ROOT
        }
    },
    plugins: [
        // Настройка DefinePlugin для передачи переменных в клиентский код
        new webpack.DefinePlugin({
            'process.env.APP_ENV': JSON.stringify(config.env),
            'process.env.PROTOCOL': JSON.stringify(config.protocol),
            'process.env.HOST': JSON.stringify(config.host),
            'process.env.CLIENT_PORT': JSON.stringify(config.clientPort),
            'process.env.SERVER_PORT': JSON.stringify(config.serverPort),
            'process.env.YOOKASSA_SHOP_ID': JSON.stringify(config.yooKassa.shopId),
        })
    ]
};
