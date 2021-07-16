<!--
*** I'm using markdown "reference style" links for readability.
*** Reference links are enclosed in brackets [ ] instead of parentheses ( ).
*** See the bottom of this document for the declaration of the reference variables
*** for contributors-url, forks-url, etc. This is an optional, concise syntax you may use.
*** https://www.markdownguide.org/basic-syntax/#reference-style-links
-->
[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<p align="center">
  <a href="./docs/meetup_icon.svg">
    <img src="images/logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Meetup online</h3>

  <p align="center">
	A simple online meeting app runs on browser.
	Implemented in TypeScript with WebRTC, Nodejs and React.
    <br />
    <a href="https://sano-jin.github.io/meetup-town/"><strong>View Demo »</strong></a>
  </p>
</p>




<!-- ABOUT THE PROJECT -->
## About The Project

Due to the influence of COVID-19, the social value of online communication tools is increasing more than ever.
Therefore, we will contribute to society by creating online conferencing tools that are
(1) open source, and
(2) simple and highly extensible.

### Built With

Some major frameworks that we used to built our project. 
* [WebRTC](https://webrtc.org/)
* [React](https://reactjs.org/)
* [TypeScript](https://www.typescriptlang.org/)
* [Nodejs](https://nodejs.org/en/)



<!-- GETTING STARTED -->
## Getting Started

This is an example of how you may give instructions on setting up your project locally.
To get a local copy up and running follow these simple example steps.

### Prerequisites

* npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

1. Get a free API Key at [https://example.com](https://example.com)
2. Clone the repo
   ```sh
   git clone https://github.com/sano-jin/meetup-town.git
   ```
3. Install NPM packages
   ```sh
   npm install
   ```
4. Enter your API in `config.js`
   ```JS
   const API_KEY = 'ENTER YOUR API';
   ```
5. Build
   ```sh
   npm run build
   ```

### Directory structure

```
+- public/                     % code/resources to distributes to clients
|   +- css/styles.css
|   +- assets/meetup_icon.svg
|   +- dist/bundle.js          % generated with `npm run build`
+- src/
|   +- server/                 % server side code
|   +- client/                 % client side code
|   +- ...
+- dist/server.js              % generated with `npm run build` 
+- view/index.ejs
+ ...
```




<!-- USAGE EXAMPLES -->
## Usage

1. Start running locally
   ```sh
   npm run start
   ```
2. Open [localhost:8000](http://localhost:8000) on your browser


_For more examples, please refer to the [Documentation](https://example.com)_



<!-- ROADMAP -->
## Roadmap

See the [open issues](https://github.com/sano-jin/meetup-online/issues) for a list of proposed features (and known issues).



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to be learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.



<!-- CONTACT -->
## Contact

Your Name - [@sano65747676](https://twitter.com/sano65747676)

Project Link: [https://github.com/sano-jin/meetup-online](https://github.com/sano-jin/meetup-town)



<!-- ACKNOWLEDGEMENTS -->
## Acknowledgements
* [webtutsplus](https://github.com/webtutsplus/videoChat-WebFrontend)




<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/othneildrew/Best-README-Template.svg?style=for-the-badge
[contributors-url]: https://github.com/othneildrew/Best-README-Template/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/othneildrew/Best-README-Template.svg?style=for-the-badge
[forks-url]: https://github.com/othneildrew/Best-README-Template/network/members
[stars-shield]: https://img.shields.io/github/stars/othneildrew/Best-README-Template.svg?style=for-the-badge
[stars-url]: https://github.com/othneildrew/Best-README-Template/stargazers
[issues-shield]: https://img.shields.io/github/issues/othneildrew/Best-README-Template.svg?style=for-the-badge
[issues-url]: https://github.com/othneildrew/Best-README-Template/issues
[license-shield]: https://img.shields.io/github/license/othneildrew/Best-README-Template.svg?style=for-the-badge
[license-url]: https://github.com/othneildrew/Best-README-Template/blob/master/LICENSE.txt
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/othneildrew



