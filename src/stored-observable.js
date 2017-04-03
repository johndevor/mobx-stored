/* global localStorage */
import {observable, autorunAsync, extendObservable} from 'mobx'
import merge from 'lodash.merge'
import cloneDeep from 'lodash.clonedeep'
import omit from 'lodash.omit'
import findGetters from './find-getters'

// 1. Create different obsVals for the different types using a switch
// 2. Edit the stored obsVal differently depending on the type

function storedObservable (key, defaultValue, debounce = 500) {
  let fromStorage = localStorage.getItem(key)
  const getterPaths = findGetters(defaultValue)
  const defaultClone = cloneDeep(defaultValue)  // we don't want to modify the given object, because userscript might want to use the original object to reset the state back to default values some time later

  if (fromStorage) {
    merge(defaultClone, JSON.parse(fromStorage))
  }
  const getStateWithoutComputeds = () => {
    return omit(obsVal, getterPaths)
  }

  // Match the defaultValue type to t1he correct mobx creation method
  // Values, Maps, Sets allowed
  let obsVal = null
  switch (Object.getPrototypeOf(defaultValue)) {
    case Map.prototype:
      // let m = new Map()
      // m.set(1,2)
      console.log('defaultClone', defaultClone)
      obsVal = observable.map(defaultClone)
      break
    default:
      obsVal = observable(defaultClone)
  }

  let disposeAutorun
  const establishAutorun = () => {
    disposeAutorun = autorunAsync(() => {
      localStorage.setItem(key, JSON.stringify(getStateWithoutComputeds()))
    }, debounce)
  }
  establishAutorun()

  const propagateChanges = (e) => {

    if (e.key === key) {
      disposeAutorun()
      const newValue = JSON.parse(e.newValue)
      //console.log('propagating....', typeof e.newValue)
      switch (type) {
        case 'map':
          obsVal.replace(newValue)
          break
        default:
          extendObservable(obsVal, newValue)
      }


      console.log(obsVal)

      establishAutorun()
    }
  }
  window.addEventListener('storage', propagateChanges)

  obsVal.reset = () => {
    extendObservable(obsVal, defaultValue)
  }
  obsVal.dispose = () => {
    disposeAutorun()
    localStorage.removeItem(key)
    window.removeEventListener(propagateChanges)
  }
  console.log('return:', obsVal)
  return obsVal
}

export default storedObservable
