import store from './index'
import * as constants from '../../model/constants'

export function GetVuxData(dataName) {
    return store.state[dataName]
}

export function SetVuxData(newData, dataName) {
    store.commit('SetData', {
        newData: newData,
        dataName: dataName
    })
}

export function GenerateComputed(dataName, setCallback) {
    return {
        set(newData) {
            SetVuxData(newData, dataName)
            if (setCallback) {
                setCallback(newData);
            }
        },
        get() {
            return GetVuxData(dataName)
        }
    }
}

export function GenerateComputedInTabsData(dataName, setCallback, getCallback) {
    let tabsData = GetVuxData(constants.TabsData)
    let curTab = GetVuxData(constants.CurTab)
    return {
        set(newData) {
            console.log(tabsData)
            tabsData[curTab][dataName] = newData
            SetVuxData(tabsData, constants.TabsData)
            if (setCallback) {
                setCallback(newData);
            }
        },
        get() {
            let curData = tabsData[curTab][dataName]
            if (getCallback) {
                getCallback(curData);
            }
            return curData;
        }
    }
}
