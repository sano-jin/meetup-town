# 実装上のメモ


## なぜかコンストラクタで this を bind しなくては行けなかった関数に関して

```typescript
this.handleJoin = this.handleJoin.bind(this);
```

みたいなやつは

```typescript
handleJoin = (userInfo: UserInfo) => {
	this.setState({ userInfo: userInfo });
}
```

のようにアロー記法で書いておくといらなくなる


というか，そもそも，React.FC で関数型ライクに書いておけばもっと良い

