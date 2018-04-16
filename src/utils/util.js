import moment from 'moment'
import * as constants from '../model/constants'
import { remote, dialog } from 'electron'

export function RemoveNullElementFromArray(arr) {
    let res = []
    arr.forEach(item => {
        if (item) {
            res.push(item)
        }
    })
    return res
}

export function ConvertProgressToDisplay(val) {
    return `${(val * 100 / constants.MAXPROGRESS).toFixed(2)}%`
}

export function ConvertProgressToInternal(str) {
    return parseFloat(str) * constants.MAXPROGRESS / 100
}

export function FormatDateTime(date) {
    return moment(date).format('YYYY-MM-DD')
}

export function GenerateNewTabData(filename, content) {
    let today = FormatDateTime()
    return {
        [constants.Content]: content,
        [constants.FileName]: filename,
        [constants.TitleNotEditing]: true,
        [constants.CurDate]: today,
        [constants.FilterText]: '',
        [constants.NewTodo]: ''
    }
}

export function ShowDialog(msg, { type = constants.DialogTypes.error, resolve = null, reject = null } = {}) {
    let curDialog = process.defaultApp ? dialog : remote.dialog

    curDialog.showMessageBox({
        type: type,
        buttons: type === constants.DialogTypes.question ? ['OK', 'Cancel'] : [],
        message: msg
    }, (response) => {
        if (response === 0) {
            // OK
            if (resolve) {
                resolve()
            }
        } else {
            // Cancel
            if (reject) {
                reject()
            }
        }
    })
}
