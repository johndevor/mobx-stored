/* global localStorage */
import {observable, autorunAsync, extendObservable} from 'mobx'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'
import omit from 'lodash.omit'
import findGetters from './find-getters'
import cookie from 'react-cookie'
import { listenCookieChange, stopListenCookieChange } from './listen-cookie-change'

function storedObservable (key, defaultValue, debounce = 500, asCookie = false) {

  // Add session option
  //    1. Add boolean flag to signify session option √
  //    2. If asCookie, do server/client-side retrieval using react-cookies √
  //    3. If asCookie, use listen-cookie-change to do cross-tab syncing √
  //    4. Throw error if cookie size is too large
  //    5. Update to allow for different kinds of objects

  // const getCookie = (typeof window != 'undefined') ? Cookies.getJSON :

  if (!asCookie && typeof localStorage == 'undefined') {
    throw "Error: cannot load from localStorage on the server. Did you mean to set the \'asCookie\' option?"
  }

  let fromStorage = asCookie ? cookie.load(key) : JSON.parse(localStorage.getItem(key))
  const getterPaths = findGetters(defaultValue)
  // we don't want to modify the given object, because userscript might want to
  // use the original object to reset the state back to default values some time later
  const defaultClone = cloneDeep(defaultValue)
  if (fromStorage) {
    merge(defaultClone, fromStorage)
  }
  const getStateWithoutComputeds = () => {
    return omit(obsVal, getterPaths)
  }
  const obsVal = observable(defaultClone)

  let disposeAutorun
  const establishAutorun = () => {
    disposeAutorun = autorunAsync(() => {
      if (asCookie)
        cookie.save(key, JSON.stringify(getStateWithoutComputeds()))
      else
        localStorage.setItem(key, JSON.stringify(getStateWithoutComputeds()))
    }, debounce)
  }
  establishAutorun()

  // Sync across tabs & windows
  const propagateChanges = (e) => {
    if (e.key === key) {
      disposeAutorun()
      console.log(e.newValue)
      const newValue = (typeof e.newValue === 'object') ? e.newValue : JSON.parse(e.newValue)
      extendObservable(obsVal, newValue)
      establishAutorun()
    }
  }
  if (asCookie) {
    listenCookieChange(key, propagateChanges)
  }
  else {
    window.addEventListener('storage', propagateChanges)
  }

  obsVal.reset = () => {
    extendObservable(obsVal, defaultValue)
  }
  obsVal.dispose = () => {
    disposeAutorun()
    if (asCookie) {
      cookie.remove(key)
      stopListenCookieChange(key)
    }
    else {
      localStorage.removeItem(key)
      window.removeEventListener(propagateChanges)
    }
  }
  return obsVal
}

export default storedObservable
