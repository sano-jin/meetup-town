# ソースコード


## 概要
随時気軽に書き足してください

ディレクトリ構成なども含めてもうちょっとなんとかしたい気分
- 適当に変えてみてくれい



## 構成


- [PDFCommandType.ts](PDFCommandType.ts)
  - PDF データを送受信するためのコマンド

- [chatMessage.ts](chatMessage.ts)
  - チャットで送るデータの定義

- [message.ts](message.ts)
  - サーバ・クライアント間で送受信し合うもの全てをまとめた定義

- [userInfo.ts](userInfo.ts)
  - ユーザ情報（名前）

- [client/](client/)
  - クライアントサイドの実装

- [server/](server/)
  - サーバサイドの実装

- [util.ts](util.ts)
  - いくつかの共用関数など



- [config.ts](config.ts)
    - Ice server の config
	- こういう API のキーみたいなのはルートディレクトリに持って行った方が良いかも




## Tree

```
├── PDFCommandType.ts
├── chatMessage.ts
├── client
│   ├── App.tsx
│   ├── Home
│   │   └── Home.tsx
│   └── Room
│       ├── Entry
│       │   └── NameForm.tsx
│       ├── Main
│       │   ├── Main.tsx
│       │   ├── UI
│       │   │   ├── ChatBoard
│       │   │   │   ├── ChatMessage.tsx
│       │   │   │   └── ChatSender.tsx
│       │   │   ├── Navigation.tsx
│       │   │   ├── PdfHandler.tsx
│       │   │   └── VideoElement.tsx
│       │   ├── UI.tsx
│       │   └── ts
│       │       ├── client.ts
│       │       ├── clientState.ts
│       │       └── config.ts
│       └── Room.tsx
├── message.ts
├── server
│   ├── server.ts
├── userInfo.ts
└── util.ts
```
