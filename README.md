# Meetup Town
An online meeting app runs on browser.

## Getting started
### Prerequisites
- `Nodejs`
- `npm`

### How to install
1. `npm install`
2. `npm run dev` 
3. open `localhost:8000` on your browser

## Directory structure

```
+- public/
|   +- App.tsx
|   +- css/styles.css
|   +- dist/bundle.js
|   |  % run `npm run build` to generate
|   +- ts/
|   |   +- client.ts
|   |   +- config.ts
|   |   +- ...
|   +- components/
|   |   +- main.tsx
|   |   +- chatMessage.tsx
|   |   +- videoElement.tsx
|   |   +- ...
+- src/
|  +- server.ts
|  +- util.ts
+- dist/ % run `npm run build` to generate
+- view/index.ejs
+ ...
```

## Acknowledgements

Our implementation is currently based on <https://github.com/webtutsplus/videoChat-WebFrontend>.


