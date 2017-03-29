/*
  Modified from source:
  http://stackoverflow.com/questions/5908504/jquery-cookie-monitor

  Unfortunately, polling is the only way I've found to check for changes in
  cookies across all major browsers
*/

import cookie from 'react-cookie'
import isEqual from 'lodash.isequal'

var cookieRegistry = []

export function listenCookieChange(cookieName, callback) {
  setInterval(function() {
    if (cookieRegistry[cookieName]) {
      if (!isEqual(cookie.load(cookieName), cookieRegistry[cookieName])) {
        // update registry so we dont get triggered again
        console.log('New cookie value set', cookie.load(cookieName))
        cookieRegistry[cookieName] = cookie.load(cookieName)
        return callback({ key: cookieName, newValue: cookie.load(cookieName) })
      }
    } else {
      cookieRegistry[cookieName] = cookie.load(cookieName)
    }
  }, 100)
}

export function stopListenCookieChange(cookieName) {
  delete cookieRegistry[cookieName]
}
