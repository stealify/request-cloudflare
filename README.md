request-cloudflare
============

Node.js library to bypass cloudflare's anti-ddos page.

If the page you want to access is protected by CloudFlare, it will return special page, which expects client to support Javascript to solve challenge.

This small library encapsulates logic which extracts challenge, solves it, submits and returns the request page body.

You can use request-cloudflare even if you are not sure if CloudFlare protection is turned on.

In general, CloudFlare has 4 types of _common_ anti-bot pages:
  - Simple html+javascript page with challenge
  - Page which redirects to original site
  - Page with recaptcha
  - Page with error ( your ip was banned, etc)

__Unfortunatelly there is no solution, if website is protected by captcha.__

If you notice that for some reason request-cloudflare stopped to work, do not hesitate and get in touch with me ( by creating an issue here, for example), so i can update it.

Install
============
```javascript
npm install request-cloudflare
```

Usage
============

```javascript
const { requestCloudflare } = require('request-cloudflare');
```

```javascript
//API Promises
requestCloudflare.promises.get('http://website.com/').then(console.log)

// API Callback
requestCloudflare.get('http://website.com/', function(error, response, body) {
  if (error) {
    console.log('Error occurred');
  } else {
    console.log(body, response);
  }
});
```

or for `POST` action:

```javascript
requestCloudflare.post('http://website.com/', {field1: 'value', field2: 2}, function(error, response, body) {
  //...
});
```

A generic request can be made with `requestCloudflare.request(options, callback)`. The options object should follow [request's options](https://www.npmjs.com/package/request#request-options-callback). Not everything is supported however, for example http methods other than GET and POST. If you wanted to request an image in binary data you could use the encoding option:

```javascript
requestCloudflare.request({
    method: 'GET',
    url:'http://website.com/image',
    encoding: null, //=>utf8
    challengesToSolve: 3, // optional, if CF returns challenge after challenge, how many to solve before failing
    followAllRedirects: true, // mandatory for successful challenge solution
  }, function(err, response, body) {
    //body is now a buffer object instead of a string
});
```

## Error object
Error object has following structure:
```
var error = {errorType: 0, error:...};
```

Where `errorType` can be following:
 - `0` if request to page failed due to some native reason as bad url, http connection or so. `error` in this case will be error [event](http://nodejs.org/api/http.html#http_class_http_server)
 - `1` cloudflare returned captcha. Nothing to do here. Bad luck
 - `2` cloudflare returned page with some inner error. `error` will be `Number` within this range `1012, 1011, 1002, 1000, 1004, 1010, 1006, 1007, 1008`. See more [here](https://support.cloudflare.com/hc/en-us/sections/200038216-CloudFlare-Error-Messages)
 - `3` this error is returned when library failed to parse and solve js challenge. `error` will be `String` with some details. :warning: :warning: __Most likely it means that cloudflare have changed their js challenge.__
 - `4` CF went into a loop and started to return challenge after challenge. If number of solved challenges is greater than `3` and another challenge is returned, throw an error


Running tests
============


### Unknown error? Library stopped working? ###
Let me know, by opening [issue](https://github.com/codemanki/request-cloudflare/issues) in this repo and i will update library asap. Please, provide url and body of page where request-cloudflare failed.


request-cloudflare uses [Request](https://github.com/request/request) to perform requests.

WAT
===========
Current cloudflare implementation requires browser to respect the timeout of 5 seconds and request-cloudflare mimics this behaviour. So everytime you call `requestCloudflare.get` you should expect it to return result after 5+ seconds.

## TODO
 - [x] Check for recaptcha
 - [x] Support cookies, so challenge can be solved once per session
 - [x] Support page with simple redirects
 - [x] Add proper testing
 - [x] Remove manual 302 processing, replace with `followAllRedirects` param
 - [ ] Parse out the timeout from chalenge page
 - [x] Reoder the arguments in get/post/request methods and allow custom options to be passed in
 - [ ] Expose solve methods to use them independently
 - [ ] Support recaptcha solving
 - [x] Promisification

## Kudos to contributors
 - [roflmuffin](https://github.com/roflmuffin)
 - [Colecf](https://github.com/Colecf)
 - [Jeongbong Seo](https://github.com/jngbng)
 - [Kamikadze4GAME](https://github.com/Kamikadze4GAME)

## Dependencies
* request https://github.com/request/request
* cheerio https://github.com/cheerio/cheerio

This library is inspired by python module [cloudflare-scrape](https://github.com/Anorov/cloudflare-scrape);
