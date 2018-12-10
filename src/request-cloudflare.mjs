import vm from 'vm';
import requestModule from 'request';
import Debug from 'debug';

const jar = requestModule.jar();
const request = requestModule.defaults({jar}); // Cookies should be enabled

const requestCloudflare = {
  MaxChallengesToSolve: 3,
  streams: {
    get(){
      //request
      /*  requestCloudflare
                .get(url)
                .on('error', (err)=>reject(err))
                .pipe(fss.createWriteStream(path).on('finish',()=>{
                    debug(url,' downloaded to ', path);
                    resolve(true);
            })); */
      return;
    }
  },
  promises: {
    get(url){
      let promise = new Promise((resolve, reject) => {
        let debug = Debug('request-cloudflare::<=');
        debug(url);
        requestCloudflare.get(url, (error, response, body) => {
          if (error) {
            debug('Error occurred', error);
            return reject(error);
          }
          resolve(body.toString('utf8'));// response
        });
      });
      return promise;
    },
    post(){}
  },
  /**
   * Performs get request to url with headers.
   * @param  {String}    url
   * @param  {Function}  callback    function(error, response, body) {}
   * @param  {Object}    headers     Hash with headers, e.g. {'Referer': 'http://google.com', 'User-Agent': '...'}
   */
  get(url, callback, headers) {
    requestCloudflare.request({ method: 'GET', url, headers }, callback);
  },
  /**
   * Performs post request to url with headers.
   * @param  {String}        url
   * @param  {String|Object} body        Will be passed as form data
   * @param  {Function}      callback    function(error, response, body) {}
   * @param  {Object}        headers     Hash with headers, e.g. {'Referer': 'http://google.com', 'User-Agent': '...'}
   */
  post(url, body, callback, headers={}) {
    var data = '';
    var bodyType = Object.prototype.toString.call(body);
  
    if(bodyType === '[object String]') {
      data = body;
    } 
    
    if (bodyType === '[object Object]') {
      data = Object.keys(body).map((key)=> key + '=' + body[key]).join('&');
    }
    
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    
    if (!headers['Content-Length']){
      headers['Content-Length'] = data.length;
    } 
  
    requestCloudflare.request({
      method: 'POST',
      body: data,
      url: url,
      headers: headers
    }, callback);
  },
  /**
   * Performs get or post request with generic request options
   * @param {Object}   options   Object to be passed to request's options argument
   * @param {Function} callback  function(error, response, body) {}
   */
  request(options={}, callback) {
    if (!options.headers) {
      options.headers = {};
    }
    
    if (!options.headers['Cache-Control']) {
      options.headers['Cache-Control'] = 'private';
    }

    if (!options.headers['Accept']) {
      options.headers['Accept'] = 'application/xml,application/xhtml+xml,text/html;q=0.9, text/plain;q=0.8,image/png,*/*;q=0.5';
    }
    
    if(typeof options.encoding !== 'string' && (!('encoding' in options))) {
      options.encoding = 'utf8';
    } 
  
    if (!options.url || !callback) {
      throw new Error('To perform request, define both url and callback');
    }
  
    if (!options.headers['User-Agent']){
      options.headers['User-Agent'] = 'Ubuntu Chromium/34.0.1847.116 Chrome/34.0.1847.116 Safari/537.36';
    }
    
    if (!options.challengesToSolve) {
      options.challengesToSolve = requestCloudflare.MaxChallengesToSolve; // Might not be the best way how to pass this variable
    }
    if (!options.followAllRedirects) {
      options.followAllRedirects = true;
    }

    request[options.method.toLowerCase()](options, (error, response, body)=>{
      responseHandler(options, error, response, body, callback);
    });
  }
};

function responseHandler(options, error, response, body, callback) {
  if (error || !body || !body.toString) {
    return callback({ errorType: 0, error: error }, response, body);
  }

  const stringBody = body.toString(options.encoding);
  let validationError = checkForErrors(error, stringBody);
    
  if (validationError) {
    return callback(validationError, response, body);
  }

  const isChallengePresent = stringBody.indexOf('a = document.getElementById(\'jschl-answer\');') !== -1;
  const isRedirectChallengePresent = stringBody.indexOf('You are being redirected') !== -1 || stringBody.indexOf('sucuri_cloudproxy_js') !== -1;
  
  if(isChallengePresent && options.challengesToSolve === 0) {
    return callback({ errorType: 4 }, response, body);
  }

  // If body contains specified string, solve challenge
  if (isChallengePresent) {
    solveChallenge(response, stringBody, options, callback);
  } else if (isRedirectChallengePresent) {
    setCookieAndReload(response, stringBody, options, callback);
  } else if (!isChallengePresent && !isRedirectChallengePresent){ // All is good
    if(typeof options.encoding === 'string') {
      body = body.toString(options.encoding);
    }
    callback(error, response, body);
  } else {
    throw new Error('unexpected responseHandler');
  }
}

function checkForErrors(error, stringBody) {
  // Pure request error (bad connection, wrong url, etc)
  if(error) {
    return { errorType: 0, error };
  }

  // Finding captcha
  if (stringBody.indexOf('why_captcha') !== -1 || /cdn-cgi\/l\/chk_captcha/i.test(stringBody)) {
    return { errorType: 1 };
  }

  // trying to find '<span class="cf-error-code">1006</span>'
  let match = stringBody.match(/<\w+\s+class="cf-error-code">(.*)<\/\w+>/i);
  if (match) {
    return { errorType: 2, error: parseInt(match[1]) };
  }

  return false;
}

function solveChallenge(response, body, options, callback) {
  setTimeout(()=>{
    options.url = response.request.uri.protocol + '//' + response.request.host + '/cdn-cgi/l/chk_jschl'; // answerUrl
    options.qs = {
      jschl_vc: body.match(/name="jschl_vc" value="(\w+)"/)[1],
      pass: body.match(/name="pass" value="(.+?)"/)[1]
    };
    
    if (!options.qs.jschl_vc || !options.qs.pass ) {
      return callback({errorType: 3, error: 'I cant extract challengeId (jschl_vc) from page'}, response, body);
    }
    
    const challenge = body.match(/getElementById\('cf-content'\)[\s\S]+?setTimeout.+?\r?\n([\s\S]+?a\.value =.+?)\r?\n/i)
      .replace(/a\.value =(.+?) \+ .+?;/i, '$1')
      .replace(/\s{3,}[a-z](?: = |\.).+/g, '')
      .replace(/'; \d+'/g, '');

    if (!challenge) {
      return callback({errorType: 3, error: 'I cant extract method from setTimeOut wrapper'}, response, body);
    }

    try {
      options.qs.jschl_answer = (eval(challenge) + response.request.host.length);
    } catch (err) {
      return callback({errorType: 3, error: 'Error occurred during evaluation: ' +  err.message}, response, body);
    }

    options.headers['Referer'] = response.request.uri.href; // Original url should be placed as referer
    options.challengesToSolve -= 1;

    // Make request with answer
    request[options.method.toLowerCase()](options, (error, response, body)=>{
      responseHandler(options, error, response, body, callback);
    });
  }, 5500); // Wait 5 sec for Cloudflare
}

function setCookieAndReload(response, body, options, callback) {
  const base64EncodedCode = body.match(/S='([^']+)'/)[1];
  
  if (!base64EncodedCode) {
    return callback({errorType: 3, error: 'I cant extract cookie generation code from page'}, response, body);
  }

  const cookieSettingCode = new Buffer(base64EncodedCode, 'base64').toString('ascii');

  const sandbox = {
    location: {
      reload: function() {}
    },
    document: {}
  };

  vm.runInNewContext(cookieSettingCode, sandbox);

  try {
    jar.setCookie(sandbox.document.cookie, response.request.uri.href, {ignoreError: true});
  } catch (err) {
    return callback({errorType: 3, error: 'Error occurred during evaluation: ' +  err.message}, response, body);
  }

  options.challengesToSolve -= 1;

  request[options.method.toLowerCase()](options, (error, response, body)=>{
    responseHandler(options, error, response, body, callback);
  });
}

export { requestCloudflare,requestCloudflare as default};