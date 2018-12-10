## Change Log

### v2.0.1 (10.12.2018)
- Add .promises API
- Refactored to ES2018
- TODO
    - Add rollup build
    - Removed grunt
    - Replaced regex with cheerio

### v2.0.0 (09/12/2018)
- [#2943](https://github.com/codemanki/cloudscraper/pull/66) Support recursive challenge solving. 
- **BREAKING CHANGE** Before this, when any error has been detected, the callback was called with an incorrect order: `callback(.., body, response);` instead of `return callback(..., response, body);`
