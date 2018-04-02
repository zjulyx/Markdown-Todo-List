import Vue from 'vue'
import Vuex from 'vuex'
import * as util from "../../utils/util";
import * as constants from "../../model/constants";
import {
    remote
} from 'electron'

let initTabsData = JSON.parse(JSON.stringify(remote.getGlobal('tabsData')))

Vue.use(Vuex)

export default new Vuex.Store({
    state: {
        [constants.FilterText]: '',
        [constants.TabsData]: initTabsData,
        [constants.CurTab]: '0',
        [constants.NewTodo]: '',
        [constants.TitleNotEditing]: true,
        [constants.CurDate]: util.FormatDateTime(new Date())
    },
    mutations: {
        SetData(state, payload) {
            // let newData = payload.newData
            // let keys = payload.keys
            // let curData = state
            // for (let key of keys) {
            //     console.log(curData)
            //     curData = curData[key]
            // }
            // curData = newData
            let newData = payload.newData
            state[payload.dataName] = newData
        }
    }
    // strict: process.env.NODE_ENV !== 'production'
})
