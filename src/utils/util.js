import fs from 'fs'
import path from 'path'
import * as constants from './constants'

export function MakeDirs(dirname, callback) {
    fs.access(dirname, err => {
        if (!err) {
            if (callback) {
                callback()
            }
        } else {
            MakeDirs(path.dirname(dirname), function () {
                fs.mkdir(dirname, callback)
            })
        }
    })
}

export function ConvertProgressToDisplay(val) {
    return `${(val * 100 / constants.MAXPROGRESS).toFixed(2)}%`
}

export function ConvertProgressToInternal(str) {
    return parseFloat(str) * constants.MAXPROGRESS / 100
}
