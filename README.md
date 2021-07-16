# Meetup Online
An online meeting app runs on browser.

Visit https://sano-jin.github.io/meetup-town/ for more information.

## Getting started
### Prerequisites
- `Nodejs`
- `npm`

### How to install
1. `npm install`
2. `npm run dev` 
3. Open [localhost:8000](http://localhost:8000) on your browser

## Directory structure

```
+- public/
|   +- css/styles.css
|   +- assets/meetup_icon.svg
|   +- dist/bundle.js
|      % run `npm run build` to generate
+- src/
|   +- server/
|   |   +- server.ts
|   +- client/
|   |   +- App.tsx
|   |   +- ts/
|   |   |   +- client.ts
|   |   |   +- config.ts
|   |   |   +- ...
|   |   +- components/
|   |       +- main.tsx
|   |       +- chatMessage.tsx
|   |       +- videoElement.tsx
|   |       +- ...
|   +- util.ts
+- dist/server.js % run `npm run build` to generate
+- view/index.ejs
+ ...
```

## Acknowledgements

Our implementation is currently based on <https://github.com/webtutsplus/videoChat-WebFrontend>.


