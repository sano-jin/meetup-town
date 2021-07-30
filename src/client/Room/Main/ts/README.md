# サーバと通信をするための TypeScript，クライアントサイドの状態の型など


ディレクトリ構成をなんとかしたい


- [clientState.ts](clientState.ts)
    - クライアントサイドの **状態** の型を定義するモジュール
	- Elm Architecture でいうところの Model の型宣言
    - Redux などで置き換えたい気分
	- クライアントサイドの状態の型はこのディレクトリにおくべきではない気がする（Main.tsx の近くが良い？）
		

- [client.ts](client.ts)
    - サーバと通信をするための TypeScript，クライアントサイドの状態の型など


- [config.ts](config.ts)
    - Ice server の config
	- こういう API のキーみたいなのはルートディレクトリに持って行った方が良いかも


